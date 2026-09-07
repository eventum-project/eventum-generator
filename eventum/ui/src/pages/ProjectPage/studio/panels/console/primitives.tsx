import { Text } from '@mantine/core';
import {
  CSSProperties,
  Children,
  FC,
  ReactElement,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
  cloneElement,
  isValidElement,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { useResizable } from '../../useResizable';

/**
 * Shared layout grammar for console debug tools.
 *
 * Every tool is a `ToolShell`: a dense toolbar pinned on top (parameters +
 * the primary run action) over a result surface that fills the console
 * height and splits into side-by-side `ToolPane`s - so the tools use the
 * console's width instead of scrolling everything vertically.
 */

const TOOL_PANE_MIN_WIDTH = 260;

interface ToolShellProps {
  toolbar: ReactNode;
  children: ReactNode;
}

export const ToolShell: FC<ToolShellProps> = ({ toolbar, children }) => (
  <div className="tool">
    <div className="tool-toolbar">{toolbar}</div>
    {children}
  </div>
);

/** Pushes trailing toolbar items (the run action) to the right edge. */
export const ToolSpacer: FC = () => <div className="tool-toolbar-spacer" />;

interface ToolPaneProps {
  /** Omit for a headerless surface (e.g. a component with its own title). */
  title?: ReactNode;
  actions?: ReactNode;
  /** Body padding; disable for edge-to-edge content like charts. */
  pad?: boolean;
  /** Make the body a flex column that clips instead of scrolls - for a single
   *  child that fills the height (a chart). Default is a scrolling block. */
  fill?: boolean;
  /** Flex grow ratio relative to sibling panes (default 1). */
  grow?: number;
  /** Fixed flex-basis width in px (with grow 0) for a non-elastic pane. */
  basis?: number;
  /** Internal size set by the nearest dragged divider. */
  resizedSize?: number;
  /** Internal marker that the starting flex split has been overridden. */
  resized?: boolean;
  children: ReactNode;
}

export const ToolPane: FC<ToolPaneProps> = ({
  title,
  actions,
  pad = true,
  fill = false,
  grow,
  basis,
  resizedSize,
  resized = false,
  children,
}) => {
  const style: CSSProperties = {};
  style.minWidth = TOOL_PANE_MIN_WIDTH;

  if (resized) {
    style.flexGrow = resizedSize === undefined ? 1 : 0;
    style.flexBasis = resizedSize ?? 0;
  } else {
    if (grow !== undefined) style.flexGrow = grow;
    if (basis !== undefined) style.flexBasis = basis;
  }

  return (
    <div className="tool-pane" style={style}>
      {title !== undefined && (
        <div className="tool-pane-header">
          <span className="tool-pane-title">{title}</span>
          {actions && <div className="tool-pane-actions">{actions}</div>}
        </div>
      )}
      <div className="tool-pane-body" data-pad={pad} data-fill={fill}>
        {children}
      </div>
    </div>
  );
};

interface PaneResizeStart {
  size: number;
  min: number;
  max: number;
  pairSize: number;
  paneSizes: number[];
}

interface ToolPaneDividerProps {
  index: number;
  onReadSnapshot: (index: number, handle: HTMLElement) => PaneResizeStart;
  onResizeStart: (index: number, handle: HTMLElement) => PaneResizeStart;
  onResize: (index: number, size: number, pairSize: number) => void;
}

function toolPaneElements(handle: HTMLElement): HTMLElement[] {
  return [...(handle.parentElement?.children ?? [])].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.classList.contains('tool-pane')
  );
}

/* A focusable ARIA separator is interactive, but jsx-a11y classifies the role
 * as static and rejects both its handlers and tab stop. */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
const ToolPaneDivider: FC<ToolPaneDividerProps> = ({
  index,
  onReadSnapshot,
  onResizeStart,
  onResize,
}) => {
  const handleRef = useRef<HTMLDivElement>(null);
  const pairSize = useRef(0);
  const [range, setRange] = useState<PaneResizeStart>();
  const resize = useResizable(0, {
    min: 0,
    max: 0,
    axis: 'x',
    getSnapshot: (event) => {
      const snapshot = onResizeStart(index, event.currentTarget as HTMLElement);
      pairSize.current = snapshot.pairSize;
      setRange(snapshot);
      return snapshot;
    },
    onResize: (size) => {
      setRange((current) =>
        current === undefined ? current : { ...current, size }
      );
      onResize(index, size, pairSize.current);
    },
  });

  useLayoutEffect(() => {
    const handle = handleRef.current;
    if (handle === null) {
      return;
    }

    const updateRange = () => setRange(onReadSnapshot(index, handle));
    const observer = new ResizeObserver(updateRange);
    for (const pane of toolPaneElements(handle)) {
      observer.observe(pane);
    }
    updateRange();

    return () => observer.disconnect();
  }, [index, onReadSnapshot]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return;
      }

      event.preventDefault();
      const snapshot = onResizeStart(index, event.currentTarget);
      const delta = event.key === 'ArrowLeft' ? -10 : 10;
      const size = Math.min(
        snapshot.max,
        Math.max(snapshot.min, snapshot.size + delta)
      );
      pairSize.current = snapshot.pairSize;
      setRange({ ...snapshot, size });
      onResize(index, size, snapshot.pairSize);
    },
    [index, onResize, onResizeStart]
  );

  return (
    <div
      ref={handleRef}
      className="studio-resizer studio-resizer-col tool-pane-resizer"
      data-dragging={resize.dragging}
      role="separator"
      aria-label={`Resize panes ${index + 1} and ${index + 2}`}
      aria-orientation="vertical"
      aria-valuemin={range === undefined ? undefined : Math.round(range.min)}
      aria-valuemax={range === undefined ? undefined : Math.round(range.max)}
      aria-valuenow={range === undefined ? undefined : Math.round(range.size)}
      tabIndex={0}
      onFocus={(event) => setRange(onReadSnapshot(index, event.currentTarget))}
      onKeyDown={handleKeyDown}
      {...resize.handleProps}
    />
  );
};
/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */

function isToolPane(child: ReactNode): child is ReactElement<ToolPaneProps> {
  return isValidElement(child) && child.type === ToolPane;
}

interface ToolBodyProps {
  /** Non-empty bodies lay out direct `ToolPane` children and split each pair. */
  children: ReactNode;
  /** Center a single message instead of laying out panes. */
  empty?: boolean;
}

export const ToolBody: FC<ToolBodyProps> = ({ children, empty = false }) => {
  const childNodes = Children.toArray(children);
  const paneCount = childNodes.filter((child) => isToolPane(child)).length;
  const [paneSizes, setPaneSizes] = useState<number[]>([]);
  const paneSizesRef = useRef(paneSizes);
  paneSizesRef.current = paneSizes;

  const readResize = useCallback(
    (index: number, handle: HTMLElement): PaneResizeStart => {
      const paneElements = toolPaneElements(handle);
      const widths = paneElements.map(
        (pane) => pane.getBoundingClientRect().width
      );
      const nextSizes = widths.slice(0, -1);
      const pairSize = widths[index]! + widths[index + 1]!;
      const max = Math.max(TOOL_PANE_MIN_WIDTH, pairSize - TOOL_PANE_MIN_WIDTH);
      const size = Math.min(max, Math.max(TOOL_PANE_MIN_WIDTH, widths[index]!));

      return {
        size,
        min: TOOL_PANE_MIN_WIDTH,
        max,
        pairSize,
        paneSizes: nextSizes,
      };
    },
    []
  );

  const startResize = useCallback(
    (index: number, handle: HTMLElement): PaneResizeStart => {
      const snapshot = readResize(index, handle);

      paneSizesRef.current = snapshot.paneSizes;
      setPaneSizes(snapshot.paneSizes);
      return snapshot;
    },
    [readResize]
  );

  const resizePane = useCallback(
    (index: number, size: number, pairSize: number) => {
      const nextSizes = [...paneSizesRef.current];
      nextSizes[index] = size;
      if (index + 1 < nextSizes.length) {
        nextSizes[index + 1] = pairSize - size;
      }

      paneSizesRef.current = nextSizes;
      setPaneSizes(nextSizes);
    },
    []
  );

  const hasResized = paneCount > 1 && paneSizes.length === paneCount - 1;
  let paneIndex = 0;
  const content: ReactNode[] = [];
  for (const child of childNodes) {
    if (!isToolPane(child)) {
      content.push(child);
      continue;
    }

    const index = paneIndex;
    paneIndex += 1;
    const isLast = index === paneCount - 1;
    const pane = cloneElement(child, {
      resized: hasResized,
      resizedSize: hasResized && !isLast ? paneSizes[index] : undefined,
    });

    if (isLast) {
      content.push(pane);
      continue;
    }

    content.push(
      pane,
      <ToolPaneDivider
        key={`tool-pane-resizer-${index}`}
        index={index}
        onReadSnapshot={readResize}
        onResizeStart={startResize}
        onResize={resizePane}
      />
    );
  }

  return (
    <div className={`tool-body${empty ? ' tool-body-empty' : ''}`}>
      {content}
    </div>
  );
};

interface ToolEmptyProps {
  icon?: ReactNode;
  children: ReactNode;
}

export const ToolEmpty: FC<ToolEmptyProps> = ({ icon, children }) => (
  <div className="tool-empty">
    {icon && <div className="tool-empty-icon">{icon}</div>}
    <Text size="sm" c="dimmed" ta="center" maw={340}>
      {children}
    </Text>
  </div>
);
