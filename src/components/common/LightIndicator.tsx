import { cn } from '@/lib/utils';
import { VariantProps, cva } from 'class-variance-authority';

const indicatorVariants = cva('shrink-0', {
  variants: {
    color: {
      green: 'bg-green-400 shadow-[0_0_3px_2px_rgba(34,197,94,0.4)]',
      orange: 'bg-amber-400 shadow-[0_0_3px_2px_rgba(245,171,0,0.4)]',
      inactive: 'bg-slate-800',
      redInactive: 'bg-red-900',
      greenInactive: 'bg-green-900',
    },
  },
  defaultVariants: {
    color: 'green',
  },
});

export type LightIndicatorProps = VariantProps<typeof indicatorVariants>;

export function LightIndicator({ color }: LightIndicatorProps) {
  return <div className={cn('w-2 h-2 rounded-full', indicatorVariants({ color }))} />;
}
