import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';
import tinycolor from 'tinycolor2';

import { cn } from '@/lib/utils';

function getContrastTextColor(bgColor: string) {
  const black = '#000';
  const white = '#fff';
  const bg = tinycolor(bgColor);

  const blackContrast = tinycolor.readability(bg, black);
  const whiteContrast = tinycolor.readability(bg, white);

  const luminance = bg.getLuminance();
  const perceptualThreshold = 0.5;

  // If both contrast ratios are decent
  if (blackContrast >= 4.5 && whiteContrast >= 3) {
    return luminance < perceptualThreshold ? white : black;
  }

  // Fallback: pick higher contrast
  return blackContrast > whiteContrast ? black : white;
}

function Badge({
  className,
  color,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & { asChild?: boolean; color: string }) {
  const Comp = asChild ? Slot : 'span';

  const textColor = getContrastTextColor(color);

  return (
    <Comp
      data-slot="badge"
      className={cn(
        'inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
        'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        className
      )}
      {...props}
      style={{ backgroundColor: color, color: textColor }}
    />
  );
}

export { Badge };
