import { fireEvent, screen } from '@testing-library/react';
import { FC } from 'react';
import { describe, expect, it } from 'vitest';

import { useResizable } from './useResizable';
import { renderWithProviders } from '@/test/render';

interface HarnessProps {
  axis: 'x' | 'y';
}

const Harness: FC<HarnessProps> = ({ axis }) => {
  const resize = useResizable(300, {
    min: 100,
    max: 500,
    axis,
    invert: true,
  });

  return (
    <>
      <output data-testid="size">{resize.size}</output>
      <div data-testid="handle" {...resize.handleProps} />
    </>
  );
};

function mockPointerCapture(element: HTMLElement): void {
  let capturedPointer: number | null = null;

  element.setPointerCapture = (pointerId: number) => {
    capturedPointer = pointerId;
  };
  element.hasPointerCapture = (pointerId: number) =>
    capturedPointer === pointerId;
  element.releasePointerCapture = (pointerId: number) => {
    if (capturedPointer === pointerId) {
      capturedPointer = null;
    }
  };
}

describe('useResizable', () => {
  it.each([
    ['x', { clientX: 100 }, { clientX: 50 }],
    ['y', { clientY: 100 }, { clientY: 50 }],
  ] as const)('inverts movement on the %s axis', (axis, start, move) => {
    renderWithProviders(<Harness axis={axis} />);
    const handle = screen.getByTestId('handle');
    mockPointerCapture(handle);

    fireEvent.pointerDown(handle, { pointerId: 5, ...start });
    fireEvent.pointerMove(handle, { pointerId: 5, ...move });

    expect(screen.getByTestId('size')).toHaveTextContent('350');
  });
});
