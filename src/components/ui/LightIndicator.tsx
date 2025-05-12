import { cn } from '@/lib/utils';
import { VariantProps, cva } from 'class-variance-authority';

const indicatorVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      color: {
        green: 'bg-green-400',
        orange: 'bg-orange-300',
        red: 'bg-red-400',
        gray: 'bg-gray-500',
        redInactive: 'bg-red-800',
        greenInactive: 'bg-green-800',
      },
    },
    defaultVariants: {
      color: 'green',
    },
  }
);

export type LightIndicatorProps = VariantProps<typeof indicatorVariants>;

export function LightIndicator({ color }: LightIndicatorProps) {
  return <div className={cn('h-2 w-2 rounded-full', indicatorVariants({ color }))}></div>;
}
