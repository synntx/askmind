import { ChevronLeftIcon, ChevronRightIcon } from "@/icons";
import React, { useState, useEffect, useCallback } from "react";

export interface GalleryImageItem {
  src: string;
  alt: string;
  title?: string;
  index?: number;
}

interface ImageGalleryProps {
  images: GalleryImageItem[];
  layout?: "grid-2" | "grid-3" | "grid-4" | "carousel" | "masonry";
  className?: string;
}

const ImageModal: React.FC<{
  imageF: GalleryImageItem;
  onClose: () => void;
  images: GalleryImageItem[];
}> = ({ imageF, onClose, images }) => {
  const initialIndex = images.findIndex(
    (img) => img.src === imageF.src && img.alt === imageF.alt,
  );
  const [openedImageIndex, setOpenedImageIndex] = useState<number>(
    initialIndex !== -1 ? initialIndex : 0,
  );

  const image: GalleryImageItem = images[openedImageIndex];

  const handleModalKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setOpenedImageIndex((prevIndex) =>
          prevIndex - 1 < 0 ? images.length - 1 : prevIndex - 1,
        );
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setOpenedImageIndex((prevIndex) =>
          prevIndex + 1 >= images.length ? 0 : prevIndex + 1,
        );
      }
    },
    [onClose, images.length, setOpenedImageIndex],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleModalKeyPress);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleModalKeyPress);
      document.body.style.overflow = "";
    };
  }, [handleModalKeyPress]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const isNavigationDisabled = images.length <= 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      {!isNavigationDisabled && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors leading-none"
          onClick={(e) => {
            e.stopPropagation();
            setOpenedImageIndex((prev) =>
              prev - 1 < 0 ? images.length - 1 : prev - 1,
            );
          }}
          aria-label="Previous image"
        >
          <ChevronLeftIcon />
        </button>
      )}

      <div className="relative max-w-full max-h-full overflow-hidden flex items-center justify-center">
        {image.src && (
          <a
            href={image.src}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 right-4 z-50 px-3 text-white text-xs p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors leading-none"
          >
            View Source
          </a>
        )}
        <img
          src={image.src}
          alt={image.alt}
          title={image.title || image.alt}
          className="max-w-full max-h-[calc(100vh-80px)] object-contain"
        />
        {(image.title || image.alt) && (
          <figcaption
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3 text-center text-[13px]
            text-white leading-tight"
          >
            {image.title || image.alt}
          </figcaption>
        )}
      </div>

      {!isNavigationDisabled && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors leading-none"
          onClick={(e) => {
            e.stopPropagation();
            setOpenedImageIndex((prev) =>
              prev + 1 >= images.length ? 0 : prev + 1,
            );
          }}
          aria-label="Next image"
        >
          <ChevronRightIcon />
        </button>
      )}
    </div>
  );
};

const ImageGalleryItem: React.FC<{
  image: GalleryImageItem;
  layout: ImageGalleryProps["layout"];
  onClick: (image: GalleryImageItem) => void;
}> = ({ image, layout, onClick }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const isCarousel = layout === "carousel";
  const isMasonry = layout === "masonry";

  const itemDimensionClasses = isCarousel
    ? "w-60 h-36 sm:w-72 sm:h-40 md:w-80 md:h-48 flex-shrink-0 snap-center"
    : "aspect-[4/3]";

  const masonryClasses = isMasonry ? "break-inside-avoid mb-4" : "";

  const placeholderBaseClasses = `absolute inset-0 flex items-center justify-center rounded-lg overflow-hidden`;

  const stateBackgroundClasses = hasError
    ? "bg-red-200/50 text-red-700"
    : isLoading
      ? "bg-muted/50"
      : "";

  const shimmerAnimationClass =
    isLoading && !hasError ? "animate-shimmer-diagonal" : "";

  const combinedPlaceholderClasses = `${placeholderBaseClasses} ${stateBackgroundClasses} ${shimmerAnimationClass}`;

  return (
    <figure
      className={`group relative overflow-hidden rounded-lg hover:opacity-90 hover:cursor-pointer active:scale-[0.97] duration-200 border border-border bg-muted/30 shadow-sm ${itemDimensionClasses} ${masonryClasses} transition-all`}
      onClick={() => onClick(image)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(image);
        }
      }}
    >
      {(isLoading || hasError) && (
        <div className={combinedPlaceholderClasses}>
          {hasError && <div className="text-center p-2">Error</div>}
        </div>
      )}

      <img
        src={image.src}
        alt={image.alt}
        title={image.title || image.alt}
        loading="lazy"
        onLoad={() => {
          setIsLoading(false);
          setHasError(false);
        }}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className={`h-full w-full object-cover transition-opacity duration-300
                    ${isLoading || hasError ? "opacity-0" : "opacity-100"}`}
      />

      {(image.title || image.alt) && (
        <figcaption
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3 text-center text-[13px]
                     text-white leading-tight"
        >
          {image.title || image.alt}
        </figcaption>
      )}
    </figure>
  );
};

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  layout = "grid-3",
  className = "",
}) => {
  const [selectedImage, setSelectedImage] = useState<GalleryImageItem | null>(
    null,
  );

  const handleImageClick = (image: GalleryImageItem, index: number) => {
    setSelectedImage({ ...image, index: index + 1 });
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  if (!images || images.length === 0) {
    return null;
  }

  let gridClasses = "";
  switch (layout) {
    case "grid-2":
      gridClasses = "grid-cols-1 sm:grid-cols-2";
      break;
    case "grid-4":
      gridClasses = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
      break;
    case "carousel":
      gridClasses = "flex overflow-x-auto space-x-4 p-4 snap-x snap-mandatory";
      break;
    case "masonry":
      gridClasses = "columns-1 sm:columns-2 md:columns-3 gap-4 space-y-4";
      break;
    case "grid-3":
    default:
      gridClasses = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
      break;
  }

  const isCarousel = layout === "carousel";
  const isMasonry = layout === "masonry";

  return (
    <div className={`my-8 ${className}`}>
      <div
        className={`${isMasonry ? "" : "grid"} ${gridClasses} ${isCarousel ? "" : "gap-4 items-start"}`}
      >
        {images.map((image, index) => (
          <ImageGalleryItem
            key={index}
            image={image}
            layout={layout}
            onClick={(img) => handleImageClick(img, index)}
          />
        ))}
      </div>

      {selectedImage && (
        <ImageModal
          imageF={selectedImage}
          onClose={handleCloseModal}
          images={images}
        />
      )}
    </div>
  );
};
