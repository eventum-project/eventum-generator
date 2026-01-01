import type { IconProps } from '@tabler/icons-react';
import * as React from 'react';

export const CustomIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ path, size = 24, title = 'CustomIcon', color }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      stroke="none"
      fill={color ?? 'currentColor'}
    >
      <title>{title}</title>
      <path d={path} />
    </svg>
  )
);

CustomIcon.displayName = 'CustomIcon';
