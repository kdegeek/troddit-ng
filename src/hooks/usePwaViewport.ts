import { useEffect } from "react";

// The visual viewport shrinks/pans for the software keyboard independently
// of the layout viewport on iOS. Do not mistake pinch zoom for a keyboard.
export default function usePwaViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      const editable = document.activeElement?.matches(
        "input, textarea, [contenteditable=true]",
      );
      const keyboard = Boolean(
        editable &&
          viewport &&
          viewport.scale === 1 &&
          window.innerHeight - viewport.height > 120,
      );
      root.dataset.keyboard = String(keyboard);
      root.style.setProperty(
        "--visual-height",
        `${viewport?.height ?? window.innerHeight}px`,
      );
      root.style.setProperty("--visual-top", `${viewport?.offsetTop ?? 0}px`);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
      delete root.dataset.keyboard;
      root.style.removeProperty("--visual-height");
      root.style.removeProperty("--visual-top");
    };
  }, []);
}
