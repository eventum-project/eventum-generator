import { formatDistanceToNow } from 'date-fns';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function RelativeDate({ date }: Readonly<{ date: Date }>) {
  const relativeDatetimeString = formatDistanceToNow(date, { addSuffix: true });

  return (
    <TooltipProvider delayDuration={700}>
      <Tooltip>
        <TooltipTrigger>
          <span>{relativeDatetimeString}</span>
        </TooltipTrigger>
        <TooltipContent>{date.toLocaleString()}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
