import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  FastForward,
  Loader2,
  Settings,
  PictureInPicture2,
  XCircle,
  ChevronRight,
  Check,
} from "lucide-react";

// eslint-disable-next-line
const getLocalStorageItem = (key: string, defaultValue: any) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Error reading localStorage key “${key}”:`, error);
    return defaultValue;
  }
};

// eslint-disable-next-line
const setLocalStorageItem = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error setting localStorage key “${key}”:`, error);
  }
};

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  tracks?: Array<{
    kind: "subtitles" | "captions";
    src: string;
    srclang: string;
    label: string;
    default?: boolean;
  }>;
  autoPlay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  defaultPlaybackRate?: number;
  playbackRates?: number[];
  width?: string | number;
  height?: string | number;
  className?: string;
  primaryColor?: string;
  enablePip?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onLoadedData?: () => void;
  onVolumeChange?: (volume: number, muted: boolean) => void;
  onPlaybackRateChange?: (rate: number) => void;
  onTrackChange?: (track: TextTrack | null) => void;
  onError?: (error: MediaError | null) => void;
}

const DEFAULT_PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  title,
  tracks = [],
  autoPlay = false,
  controls = true,
  loop = false,
  muted: initialMutedProp = false,
  defaultPlaybackRate = 1,
  playbackRates = DEFAULT_PLAYBACK_RATES,
  width = "100%",
  height,
  className,
  primaryColor = "#3b82f6",
  enablePip = true,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onLoadedData,
  onVolumeChange,
  onPlaybackRateChange,
  onTrackChange,
  onError,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [isMuted, setIsMuted] = useState(() =>
    getLocalStorageItem("videoPlayerMuted", initialMutedProp),
  );
  const [volume, setVolume] = useState(() =>
    getLocalStorageItem("videoPlayerVolume", isMuted ? 0 : 0.75),
  );

  const [playbackRate, setPlaybackRate] = useState(defaultPlaybackRate);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(autoPlay);
  const [buffered, setBuffered] = useState(0);

  const [isPipActive, setIsPipActive] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsSubMenu, setSettingsSubMenu] = useState<
    "playbackRate" | "captions" | null
  >(null);

  const [availableTextTracks, setAvailableTextTracks] = useState<TextTrack[]>(
    [],
  );
  const [activeTextTrack, setActiveTextTrack] = useState<TextTrack | null>(
    null,
  );
  const [videoError, setVideoError] = useState<MediaError | null>(null);

  useEffect(() => {
    setLocalStorageItem("videoPlayerVolume", volume);
    setLocalStorageItem("videoPlayerMuted", isMuted);
    onVolumeChange?.(volume, isMuted);
  }, [volume, isMuted, onVolumeChange]);

  const handleTimeUpdateInternal = useCallback(() => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
    onTimeUpdate?.(videoRef.current!.currentTime);
  }, [onTimeUpdate]);

  const handleDurationChangeInternal = useCallback(() => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  }, []);

  const handleVideoPlayInternal = useCallback(() => {
    setIsPlaying(true);
    setIsBuffering(false);
    onPlay?.();
  }, [onPlay]);

  const handleVideoPauseInternal = useCallback(() => {
    setIsPlaying(false);
    setIsBuffering(false);
    onPause?.();
  }, [onPause]);

  const handleVideoEndedInternal = useCallback(() => {
    setIsPlaying(false);
    onEnded?.();
    if (loop && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  }, [onEnded, loop]);

  const handleWaitingInternal = useCallback(() => setIsBuffering(true), []);
  const handleCanPlayInternal = useCallback(() => setIsBuffering(false), []);

  const handleLoadedMetadataInternal = useCallback(() => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    setIsBuffering(false);
    if (autoPlay && videoRef.current.paused) {
      videoRef.current
        .play()
        .catch((err) => console.warn("Autoplay prevented:", err));
    }
    const tracks = Array.from(videoRef.current.textTracks).filter(
      (t) => t.kind === "subtitles" || t.kind === "captions",
    );
    setAvailableTextTracks(tracks);
    const defaultTrack =
      tracks.find((t) => t.mode === "showing") ||
      // eslint-disable-next-line
      tracks.find((t) => (t as any).default);
    if (defaultTrack) {
      setActiveTextTrack(defaultTrack);
      defaultTrack.mode = "showing";
    }
    onLoadedData?.();
  }, [autoPlay, onLoadedData]);

  const handleProgressInternal = useCallback(() => {
    if (videoRef.current?.buffered.length && duration > 0) {
      setBuffered(
        (videoRef.current.buffered.end(videoRef.current.buffered.length - 1) /
          duration) *
          100,
      );
    } else setBuffered(0);
  }, [duration]);

  const handleErrorInternal = useCallback(() => {
    if (videoRef.current?.error) {
      setVideoError(videoRef.current.error);
      onError?.(videoRef.current.error);
    }
  }, [onError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;
    video.volume = volume;
    video.playbackRate = playbackRate;

    const handleVolumeSync = () => {
      if (videoRef.current) {
        setVolume(videoRef.current.volume);
        setIsMuted(videoRef.current.muted);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdateInternal);
    video.addEventListener("durationchange", handleDurationChangeInternal);
    video.addEventListener("loadedmetadata", handleLoadedMetadataInternal);
    video.addEventListener("play", handleVideoPlayInternal);
    video.addEventListener("pause", handleVideoPauseInternal);
    video.addEventListener("ended", handleVideoEndedInternal);
    video.addEventListener("waiting", handleWaitingInternal);
    video.addEventListener("canplay", handleCanPlayInternal);
    video.addEventListener("progress", handleProgressInternal);
    video.addEventListener("volumechange", handleVolumeSync);
    video.addEventListener("error", handleErrorInternal);

    if (video.readyState >= video.HAVE_METADATA) handleLoadedMetadataInternal();
    if (autoPlay && video.paused) setIsBuffering(true);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdateInternal);
      video.removeEventListener("durationchange", handleDurationChangeInternal);
      video.removeEventListener("loadedmetadata", handleLoadedMetadataInternal);
      video.removeEventListener("play", handleVideoPlayInternal);
      video.removeEventListener("pause", handleVideoPauseInternal);
      video.removeEventListener("ended", handleVideoEndedInternal);
      video.removeEventListener("waiting", handleWaitingInternal);
      video.removeEventListener("canplay", handleCanPlayInternal);
      video.removeEventListener("progress", handleProgressInternal);
      video.removeEventListener("volumechange", handleVolumeSync);
      video.removeEventListener("error", handleErrorInternal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused || videoRef.current.ended) {
        videoRef.current.play().catch((error) => {
          console.warn("Video play failed:", error);
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
  }, []);

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (videoRef.current) {
        const newVol = parseFloat(e.target.value);
        videoRef.current.volume = newVol;
        videoRef.current.muted = newVol === 0;
      }
    },
    [],
  );

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const time = parseFloat(e.target.value);
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const skip = useCallback(
    (seconds: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(
          0,
          Math.min(duration, videoRef.current.currentTime + seconds),
        );
        setCurrentTime(videoRef.current.currentTime);
      }
    },
    [duration],
  );

  const changePlaybackRate = useCallback(
    (rate: number) => {
      if (videoRef.current) {
        videoRef.current.playbackRate = rate;
        setPlaybackRate(rate);
        onPlaybackRateChange?.(rate);
        setSettingsSubMenu(null);
      }
    },
    [onPlaybackRateChange],
  );

  const changeTextTrack = useCallback(
    (track: TextTrack | null) => {
      availableTextTracks.forEach((t) => (t.mode = "disabled"));
      if (track && videoRef.current) {
        track.mode = "showing";
        setActiveTextTrack(track);
      } else {
        setActiveTextTrack(null);
      }
      onTrackChange?.(track);
      setSettingsSubMenu(null);
    },
    [availableTextTracks, onTrackChange],
  );

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement)
      containerRef.current.requestFullscreen().catch(console.warn);
    else document.exitFullscreen();
  }, []);

  useEffect(() => {
    const cb = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", cb);
    return () => document.removeEventListener("fullscreenchange", cb);
  }, []);

  const togglePip = useCallback(async () => {
    if (!videoRef.current || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement === videoRef.current) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error("PiP error:", error);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !enablePip) return;
    const onEnterPip = () => setIsPipActive(true);
    const onLeavePip = () => setIsPipActive(false);
    video.addEventListener("enterpictureinpicture", onEnterPip);
    video.addEventListener("leavepictureinpicture", onLeavePip);
    return () => {
      video.removeEventListener("enterpictureinpicture", onEnterPip);
      video.removeEventListener("leavepictureinpicture", onLeavePip);
    };
  }, [enablePip]);

  const hideControls = useCallback(() => {
    if (isPlaying) setShowControls(false);
  }, [isPlaying]);
  const manageControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    if (isPlaying) controlsTimeoutRef.current = setTimeout(hideControls, 3000);
  }, [isPlaying, hideControls]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !controls) return;
    const enter = () =>
      isPlaying ? manageControlsTimeout() : setShowControls(true);
    const leave = () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (isPlaying) hideControls();
    };
    container.addEventListener("mousemove", manageControlsTimeout);
    container.addEventListener("mouseenter", enter);
    container.addEventListener("mouseleave", leave);
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      container.removeEventListener("mousemove", manageControlsTimeout);
      container.removeEventListener("mouseenter", enter);
      container.removeEventListener("mouseleave", leave);
    };
  }, [manageControlsTimeout, controls, isPlaying, hideControls]);

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const playerFocused =
        containerRef.current?.contains(activeEl) ||
        video === activeEl ||
        e.target === document.body;
      if (!playerFocused && !(e.key === " " && e.target === document.body))
        return;
      if (
        activeEl &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(activeEl.tagName) &&
        e.key !== "Escape"
      )
        return;

      const seekPercentage = (p: number) => {
        if (duration > 0) video.currentTime = duration * (p / 100);
      };

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "p":
          if (enablePip && document.pictureInPictureEnabled) {
            e.preventDefault();
            togglePip();
          }
          break;
        case "ArrowLeft":
        case "j":
          e.preventDefault();
          skip(-5);
          break;
        case "ArrowRight":
        case "l":
          e.preventDefault();
          skip(5);
          break;
        case "ArrowUp":
          e.preventDefault();
          video.volume = Math.min(video.volume + 0.05, 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          video.volume = Math.max(video.volume - 0.05, 0);
          break;
        case "<":
          e.preventDefault();
          if (playbackRates.includes(video.playbackRate)) {
            const currentIndex = playbackRates.indexOf(video.playbackRate);
            if (currentIndex > 0)
              changePlaybackRate(playbackRates[currentIndex - 1]);
          }
          break;
        case ">":
          e.preventDefault();
          if (playbackRates.includes(video.playbackRate)) {
            const currentIndex = playbackRates.indexOf(video.playbackRate);
            if (currentIndex < playbackRates.length - 1)
              changePlaybackRate(playbackRates[currentIndex + 1]);
          }
          break;
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          e.preventDefault();
          seekPercentage(parseInt(e.key) * 10);
          break;
        case "Escape":
          if (isFullscreen) {
            e.preventDefault();
            toggleFullscreen();
          }
          if (showSettingsMenu) {
            e.preventDefault();
            setShowSettingsMenu(false);
            setSettingsSubMenu(null);
          }
          break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    togglePlay,
    toggleMute,
    toggleFullscreen,
    skip,
    isFullscreen,
    enablePip,
    togglePip,
    duration,
    changePlaybackRate,
    playbackRates,
    showSettingsMenu,
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target as Node) &&
        containerRef.current &&
        !containerRef.current
          .querySelector('button[aria-label="Settings"]')
          ?.contains(event.target as Node)
      ) {
        setShowSettingsMenu(false);
        setSettingsSubMenu(null);
      }
    };
    if (showSettingsMenu)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSettingsMenu]);

  const formatTime = (t: number) =>
    new Date(1000 * (isNaN(t) || !isFinite(t) ? 0 : t))
      .toISOString()
      .substr(11, 8)
      .replace(/^[0:]+(?=\d{2}:)/, "");
  const progressStyle = {
    background: `linear-gradient(to right, ${primaryColor} ${duration > 0 ? (currentTime / duration) * 100 : 0}%, rgba(200,200,200,0.6) ${duration > 0 ? (currentTime / duration) * 100 : 0}%, rgba(200,200,200,0.6) ${buffered}%, rgba(100,100,100,0.4) ${buffered}%)`,
  };
  const volumeStyle = {
    background: `linear-gradient(to right, white ${isMuted ? 0 : volume * 100}%, rgba(255,255,255,0.3) ${isMuted ? 0 : volume * 100}%)`,
  };

  if (videoError) {
    return (
      <div
        className={`relative bg-black text-white flex flex-col items-center justify-center ${className || ""}`}
        style={{ width, height: height || "auto" }}
      >
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <p className="text-lg">Video Error</p>
        <p className="text-sm text-gray-400">
          Could not load the video. (Code: {videoError.code})
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative group/videoPlayer bg-black ${className || ""}`}
      style={{ width, height: height || "auto" }}
      tabIndex={-1}
    >
      <video
        ref={videoRef}
        className="w-full h-full rounded-lg object-cover block"
        src={src}
        poster={poster}
        title={title}
        loop={loop && !onEnded}
        playsInline
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      >
        {tracks.map((track, i) => (
          <track
            key={i}
            kind={track.kind}
            src={track.src}
            srcLang={track.srclang}
            label={track.label}
            default={track.default}
          />
        ))}
        Your browser does not support the video tag.
      </video>

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 pointer-events-none">
          <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-white animate-spin" />
        </div>
      )}

      {controls && (
        <div
          className={`absolute bottom-0 left-0 right-0 z-20 p-2.5 pb-2 md:p-4 md:pb-3 bg-gradient-to-t from-black/80 via-black/60 to-transparent transition-opacity duration-300 ease-in-out ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative mb-2 md:mb-2.5 px-1">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              aria-label="Video progress"
              className="video-progress-slider w-full h-2.5 appearance-none cursor-pointer focus:outline-none"
              style={progressStyle}
            />
          </div>
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-1.5 md:gap-2.5">
              <button
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause (k)" : "Play (k)"}
                className="p-1.5 hover:bg-white/20 rounded-full t-colors focus-visible"
              >
                <PlayPauseIcon isPlaying={isPlaying} />
              </button>
              <button
                onClick={() => skip(-5)}
                aria-label="Rewind 5s (j)"
                className="p-1.5 hover:bg-white/20 rounded-full t-colors focus-visible"
              >
                <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={() => skip(10)}
                aria-label="Forward 10s (l)"
                className="p-1.5 hover:bg-white/20 rounded-full t-colors focus-visible"
              >
                <FastForward className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <div className="flex items-center gap-1 md:gap-1.5">
                <button
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute (m)" : "Mute (m)"}
                  className="p-1.5 hover:bg-white/20 rounded-full t-colors focus-visible"
                >
                  <VolumeIcon isMuted={isMuted} volume={volume} />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  aria-label="Volume"
                  className="video-volume-slider w-[70px] md:w-[90px] h-2 appearance-none cursor-pointer t-colors focus:outline-none"
                  style={volumeStyle}
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2.5">
              <span className="text-xs md:text-sm font-medium tabular-nums whitespace-nowrap">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              {enablePip && document.pictureInPictureEnabled && (
                <button
                  onClick={togglePip}
                  aria-label={
                    isPipActive
                      ? "Exit Picture-in-Picture (p)"
                      : "Enter Picture-in-Picture (p)"
                  }
                  className="p-1.5 hover:bg-white/20 rounded-full t-colors focus-visible"
                >
                  <PictureInPicture2
                    className={`w-5 h-5 md:w-6 md:h-6 ${isPipActive ? "text-blue-400" : ""}`}
                  />
                </button>
              )}
              <div className="relative" ref={settingsMenuRef}>
                <button
                  onClick={() => {
                    setShowSettingsMenu(!showSettingsMenu);
                    setSettingsSubMenu(null);
                  }}
                  aria-label="Settings"
                  className="p-1.5 hover:bg-white/20 rounded-full t-colors focus-visible"
                >
                  <Settings className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                {showSettingsMenu && (
                  <div
                    className="absolute bottom-full right-0 mb-2 w-60 bg-black/60 backdrop-blur-3xl rounded-md shadow-lg py-1 text-sm"
                    style={{
                      colorScheme: "dark",
                    }}
                  >
                    {!settingsSubMenu && (
                      <>
                        <SettingsMenuItem
                          label="Playback speed"
                          value={`${playbackRate}x`}
                          onClick={() => setSettingsSubMenu("playbackRate")}
                        />
                        {availableTextTracks.length > 0 && (
                          <SettingsMenuItem
                            label="Captions"
                            value={activeTextTrack?.label || "Off"}
                            onClick={() => setSettingsSubMenu("captions")}
                          />
                        )}
                      </>
                    )}
                    {settingsSubMenu === "playbackRate" && (
                      <>
                        <SettingsMenuHeader
                          title="Playback speed"
                          onBack={() => setSettingsSubMenu(null)}
                        />
                        {playbackRates.map((rate) => (
                          <SettingsMenuOption
                            key={rate}
                            label={`${rate}x`}
                            isActive={playbackRate === rate}
                            onClick={() => changePlaybackRate(rate)}
                          />
                        ))}
                      </>
                    )}
                    {settingsSubMenu === "captions" && (
                      <>
                        <SettingsMenuHeader
                          title="Captions"
                          onBack={() => setSettingsSubMenu(null)}
                        />
                        <SettingsMenuOption
                          label="Off"
                          isActive={!activeTextTrack}
                          onClick={() => changeTextTrack(null)}
                        />
                        {availableTextTracks.map((track) => (
                          <SettingsMenuOption
                            key={track.label + track.language}
                            label={track.label || track.language}
                            isActive={activeTextTrack === track}
                            onClick={() => changeTextTrack(track)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={toggleFullscreen}
                aria-label={
                  isFullscreen ? "Exit fullscreen (f)" : "Enter fullscreen (f)"
                }
                className="p-1.5 hover:bg-white/20 rounded-full t-colors focus-visible"
              >
                <FullscreenIcon isFullscreen={isFullscreen} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PlayPauseIcon: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) =>
  isPlaying ? (
    <Pause className="w-5 h-5 md:w-6 md:h-6" />
  ) : (
    <Play className="w-5 h-5 md:w-6 md:h-6" />
  );
const VolumeIcon: React.FC<{ isMuted: boolean; volume: number }> = ({
  isMuted,
  volume,
}) =>
  isMuted || volume === 0 ? (
    <VolumeX className="w-5 h-5 md:w-6 md:h-6" />
  ) : (
    <Volume2 className="w-5 h-5 md:w-6 md:h-6" />
  );
const FullscreenIcon: React.FC<{ isFullscreen: boolean }> = ({
  isFullscreen,
}) =>
  isFullscreen ? (
    <Minimize className="w-5 h-5 md:w-6 md:h-6" />
  ) : (
    <Maximize className="w-5 h-5 md:w-6 md:h-6" />
  );

const SettingsMenuItem: React.FC<{
  label: string;
  value: string;
  onClick: () => void;
}> = ({ label, value, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex justify-between items-center px-4 py-2.5 hover:bg-white/10 t-colors text-left"
  >
    <span>{label}</span>
    <div className="flex items-center gap-2 text-gray-400">
      <span>{value}</span>
      <ChevronRight className="w-4 h-4" />
    </div>
  </button>
);
const SettingsMenuHeader: React.FC<{ title: string; onBack: () => void }> = ({
  title,
  onBack,
}) => (
  <div className="flex items-center px-2 py-1.5 border-b border-white/10 mb-1">
    <button
      onClick={onBack}
      className="p-2 hover:bg-white/10 rounded-full mr-1"
    >
      <ChevronRight className="w-5 h-5 transform rotate-180" />
    </button>
    <span className="font-semibold">{title}</span>
  </div>
);
const SettingsMenuOption: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center px-4 py-2.5 hover:bg-white/10 t-colors text-left"
  >
    <div className="w-6">
      {isActive && <Check className="w-5 h-5" style={{ color: "#3b82f6" }} />}
    </div>
    <span>{label}</span>
  </button>
);
