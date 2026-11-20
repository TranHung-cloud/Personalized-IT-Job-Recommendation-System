import { useLayoutEffect, useState } from "react";

export function useDropdownPlacement<T extends HTMLElement>(
  isOpen: boolean,
  anchorRef: { current: T | null },
  contentCount: number,
) {
  const [placement, setPlacement] = useState<"above" | "below">("below");
  const [maxHeight, setMaxHeight] = useState(160);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const anchor = anchorRef.current;
    if (!anchor) return;

    let scrollContainer: HTMLElement | null = anchor.parentElement;
    while (scrollContainer) {
      const { overflowY } = window.getComputedStyle(scrollContainer);
      if (
        (overflowY === "auto" || overflowY === "scroll") &&
        scrollContainer.scrollHeight > scrollContainer.clientHeight
      ) {
        break;
      }
      scrollContainer = scrollContainer.parentElement;
    }

    function updatePlacement() {
      const anchorRect = anchor.getBoundingClientRect();
      const containerRect = scrollContainer?.getBoundingClientRect();
      const topEdge = containerRect
        ? containerRect.top + scrollContainer!.clientTop
        : 0;
      const bottomEdge = containerRect
        ? topEdge + scrollContainer!.clientHeight
        : window.innerHeight;
      const roomAbove = Math.max(0, anchorRect.top - topEdge - 8);
      const roomBelow = Math.max(0, bottomEdge - anchorRect.bottom - 8);
      const shouldFlipAbove = roomBelow < 160 && roomAbove > roomBelow;

      setPlacement(shouldFlipAbove ? "above" : "below");
      setMaxHeight(
        Math.max(40, Math.min(160, shouldFlipAbove ? roomAbove : roomBelow)),
      );
    }

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    scrollContainer?.addEventListener("scroll", updatePlacement);
    return () => {
      window.removeEventListener("resize", updatePlacement);
      scrollContainer?.removeEventListener("scroll", updatePlacement);
    };
  }, [anchorRef, contentCount, isOpen]);

  return { placement, maxHeight };
}
