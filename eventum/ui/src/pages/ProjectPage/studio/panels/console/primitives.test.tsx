import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ToolBody, ToolEmpty, ToolPane } from './primitives';
import { renderWithProviders } from '@/test/render';

function mockWidth(element: HTMLElement, width: number): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    width,
  } as DOMRect);
}

function mockPointerCapture(element: HTMLElement): void {
  let capturedPointer: number | null = null;

  element.setPointerCapture = vi.fn((pointerId: number) => {
    capturedPointer = pointerId;
  });
  element.hasPointerCapture = vi.fn(
    (pointerId: number) => capturedPointer === pointerId
  );
  element.releasePointerCapture = vi.fn((pointerId: number) => {
    if (capturedPointer === pointerId) {
      capturedPointer = null;
    }
  });
}

describe('console tool panes', () => {
  it('drags and clamps a split while leaving the other pane boundary alone', () => {
    const { container } = renderWithProviders(
      <ToolBody>
        <ToolPane title="Formatter" grow={0} basis={300}>
          formatter
        </ToolPane>
        <ToolPane title="Events">events</ToolPane>
        <ToolPane title="Result">result</ToolPane>
      </ToolBody>
    );
    const panes = [...container.querySelectorAll<HTMLElement>('.tool-pane')];
    const resizers = [
      ...container.querySelectorAll<HTMLElement>('.tool-pane-resizer'),
    ];

    expect(resizers).toHaveLength(2);
    expect(panes[0]).toHaveStyle({ flexGrow: '0', flexBasis: '300px' });

    mockWidth(panes[0]!, 300);
    mockWidth(panes[1]!, 350);
    mockWidth(panes[2]!, 350);
    mockPointerCapture(resizers[0]!);

    fireEvent.pointerDown(resizers[0]!, { pointerId: 7, clientX: 100 });
    expect(resizers[0]).toHaveAttribute('data-dragging', 'true');

    fireEvent.pointerMove(resizers[0]!, { pointerId: 7, clientX: 150 });
    expect(panes[0]).toHaveStyle({ flexGrow: '0', flexBasis: '350px' });
    expect(panes[1]).toHaveStyle({ flexGrow: '0', flexBasis: '300px' });
    expect(panes[2]).toHaveStyle({ flexGrow: '1', flexBasis: '0px' });

    fireEvent.pointerMove(resizers[0]!, { pointerId: 7, clientX: -500 });
    expect(panes[0]).toHaveStyle({ flexBasis: '260px' });
    expect(panes[1]).toHaveStyle({ flexBasis: '390px' });

    fireEvent.pointerUp(resizers[0]!, { pointerId: 7 });
    expect(resizers[0]).toHaveAttribute('data-dragging', 'false');
    expect(resizers[0]!.releasePointerCapture).toHaveBeenCalledWith(7);
  });

  it('does not add a divider without two panes', () => {
    const { container, rerender } = renderWithProviders(
      <ToolBody>
        <ToolPane>only pane</ToolPane>
      </ToolBody>
    );

    expect(container.querySelector('.tool-pane-resizer')).toBeNull();

    rerender(
      <ToolBody empty>
        <ToolEmpty>nothing to show</ToolEmpty>
      </ToolBody>
    );
    expect(container.querySelector('.tool-pane-resizer')).toBeNull();
  });

  it('clamps the rightmost divider against the last pane', () => {
    const { container } = renderWithProviders(
      <ToolBody>
        <ToolPane>first</ToolPane>
        <ToolPane>second</ToolPane>
        <ToolPane>last</ToolPane>
      </ToolBody>
    );
    const panes = [...container.querySelectorAll<HTMLElement>('.tool-pane')];
    const dividers = [
      ...container.querySelectorAll<HTMLElement>('.tool-pane-resizer'),
    ];
    mockWidth(panes[0]!, 300);
    mockWidth(panes[1]!, 350);
    mockWidth(panes[2]!, 350);
    mockPointerCapture(dividers[1]!);

    fireEvent.pointerDown(dividers[1]!, { pointerId: 8, clientX: 100 });
    fireEvent.pointerMove(dividers[1]!, { pointerId: 8, clientX: 1000 });

    expect(panes[0]).toHaveStyle({ flexBasis: '300px' });
    expect(panes[1]).toHaveStyle({ flexBasis: '440px' });
    expect(panes[2]).toHaveStyle({ flexGrow: '1', flexBasis: '0px' });
    expect(dividers[1]).toHaveAttribute('aria-valuenow', '440');
  });

  it('names a divider and resizes its panes from the keyboard', () => {
    const { container } = renderWithProviders(
      <ToolBody>
        <ToolPane>left</ToolPane>
        <ToolPane>right</ToolPane>
      </ToolBody>
    );
    const panes = [...container.querySelectorAll<HTMLElement>('.tool-pane')];
    const divider = container.querySelector<HTMLElement>('.tool-pane-resizer');
    if (divider === null) {
      throw new Error('the pane resize handle is not mounted');
    }

    expect(divider).toHaveAttribute('aria-valuemin', '260');
    expect(divider).toHaveAttribute('aria-valuenow', '260');

    mockWidth(panes[0]!, 300);
    mockWidth(panes[1]!, 350);

    expect(divider).toHaveAttribute('role', 'separator');
    expect(divider).toHaveAccessibleName('Resize panes 1 and 2');
    expect(divider).toHaveAttribute('tabindex', '0');

    fireEvent.focus(divider);
    fireEvent.keyDown(divider, { key: 'ArrowRight' });

    expect(panes[0]).toHaveStyle({ flexBasis: '310px' });
    expect(divider).toHaveAttribute('aria-valuemin', '260');
    expect(divider).toHaveAttribute('aria-valuemax', '390');
    expect(divider).toHaveAttribute('aria-valuenow', '310');
  });
});
