import { useEffect } from "react";

const isEditableElement = (el: EventTarget | null) => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    el.getAttribute("role") === "textbox"
  );
};

export const useFocusOnType = (
  targetRef: React.RefObject<HTMLTextAreaElement | null>,
) => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.isComposing
      )
        return;

      if (isEditableElement(e.target)) return;

      if (!e.key || e.key.length !== 1) return;

      const el = targetRef.current;

      if (!el || document.activeElement === el || el.disabled || el.readOnly)
        return;

      el.focus({ preventScroll: true });
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [targetRef]);
};
