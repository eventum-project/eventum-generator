import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
  useState,
} from 'react';

interface ResizeSnapshot {
  size: number;
  min: number;
  max: number;
}

interface ResizableOptions {
  min: number;
  max: number;
  axis: 'x' | 'y';
  /** Invert delta when the handle sits before the panel it sizes. */
  invert?: boolean;
  /** Read a size and bounds from the live layout when dragging starts. */
  getSnapshot?: (e: ReactPointerEvent) => ResizeSnapshot;
  /** Observe each clamped size while the pointer moves. */
  onResize?: (size: number) => void;
}

interface HandleProps {
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerMove: (e: ReactPointerEvent) => void;
  onPointerUp: (e: ReactPointerEvent) => void;
  onPointerCancel: (e: ReactPointerEvent) => void;
}

interface Resizable {
  size: number;
  dragging: boolean;
  handleProps: HandleProps;
}

/**
 * Pointer-driven panel resizing with no external dependency. The parent
 * keeps the size in state and spreads `handleProps` onto a resize gutter.
 */
export function useResizable(
  initial: number,
  { min, max, axis, invert = false, getSnapshot, onResize }: ResizableOptions
): Resizable {
  const [size, setSize] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const start = useRef(0);
  const origin = useRef(initial);
  const activeMin = useRef(min);
  const activeMax = useRef(max);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const snapshot = getSnapshot?.(e);

      setDragging(true);
      start.current = axis === 'x' ? e.clientX : e.clientY;
      origin.current = snapshot?.size ?? size;
      activeMin.current = snapshot?.min ?? min;
      activeMax.current = snapshot?.max ?? max;
      if (snapshot !== undefined) {
        setSize(snapshot.size);
      }
    },
    [axis, getSnapshot, max, min, size]
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) {
        return;
      }
      const current = axis === 'x' ? e.clientX : e.clientY;
      const delta = (current - start.current) * (invert ? -1 : 1);
      const next = Math.min(
        activeMax.current,
        Math.max(activeMin.current, origin.current + delta)
      );
      setSize(next);
      onResize?.(next);
    },
    [axis, invert, onResize]
  );

  const stop = useCallback((e: ReactPointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  }, []);

  return {
    size,
    dragging,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: stop,
      onPointerCancel: stop,
    },
  };
}
