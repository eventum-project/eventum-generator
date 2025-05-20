import { cn } from '@/lib/utils';
import { VariantProps, cva } from 'class-variance-authority';

const indicatorVariants = cva('shrink-0 bg-radial to-black from-35% to-200%', {
  variants: {
    color: {
      green: 'from-green-400 shadow-[0_0_1px_1px_rgba(34,197,94,0.6)]',
      orange: 'from-amber-400 shadow-[0_0_1px_1px_rgba(245,171,0,0.6)]',
      inactive: 'from-slate-600',
      redInactive: 'from-red-800',
      greenInactive: 'from-green-800',
    },
  },
  defaultVariants: {
    color: 'green',
  },
});

export type LightIndicatorProps = VariantProps<typeof indicatorVariants>;

export function LightIndicator({ color }: LightIndicatorProps) {
  return <div className={cn('w-1.5 h-4 rounded-full', indicatorVariants({ color }))} />;
}
