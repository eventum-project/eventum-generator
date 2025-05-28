'use client';

import { LightIndicator } from '@/components/common/LightIndicator';
import { RelativeDate } from '@/components/common/RelativeDate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ColumnDef } from '@tanstack/react-table';
import { Loader2, Play, Repeat, Square } from 'lucide-react';

import { ColumnHeader } from './ColumnHeader';
import { RowActions } from './RowActions';
import { GeneratorInfo } from './schema';
import { GENERATOR_STATUSES, GeneratorStatus } from './statuses';

export const COLUMNS: ColumnDef<GeneratorInfo>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px] cursor-pointer"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px] cursor-pointer"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    meta: {
      className: 'pl-8',
    },
  },
  {
    accessorKey: 'id',
    header: ({ column }) => <ColumnHeader column={column} title="ID" />,
    cell: ({ row }) => {
      return (
        <div className="flex flex-col space-y-1">
          <span className="max-w-[500px] truncate font-medium">{row.getValue('id')}</span>
          <div className="flex flex-wrap gap-1">
            {row.original.tags.map((tag) => (
              <Badge key={tag.name} color={tag.color} asChild>
                <a href="#">{tag.name}</a>
              </Badge>
            ))}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <ColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const status_value: GeneratorStatus = row.getValue('status');
      const status = GENERATOR_STATUSES[status_value];

      return (
        <div className="flex w-[100px] items-center space-x-3">
          <LightIndicator {...status.indicatorProps} />
          <span className="">{status.label}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'lastStarted',
    header: ({ column }) => <ColumnHeader column={column} title="Last started" />,
    cell: ({ row }) => {
      const value: string | undefined = row.getValue('lastStarted');
      console.log(value);
      if (value !== undefined) {
        return RelativeDate({ date: new Date(value) });
      } else {
        return <span>-</span>;
      }
    },
  },
  {
    accessorKey: 'created',
    header: ({ column }) => <ColumnHeader column={column} title="Created" />,
    cell: ({ row }) => {
      return RelativeDate({ date: new Date(row.getValue('created')) });
    },
  },
  {
    id: 'actions',
    header: ({ column }) => (
      <div className="flex justify-center">
        <ColumnHeader column={column} title="Actions" />
      </div>
    ),
    cell: ({ row }) => {
      let action: JSX.Element;
      if (row.original.status === GeneratorStatus.Running) {
        action = (
          <Button variant="ghost" size="icon" aria-label="Stop" className="cursor-pointer">
            <Square />
          </Button>
        );
      } else if (
        row.original.status === GeneratorStatus.Starting ||
        row.original.status === GeneratorStatus.Stopping
      ) {
        action = (
          <Button disabled variant="ghost" size="icon" aria-label="Loading">
            <Loader2 className="animate-spin" />
          </Button>
        );
      } else {
        action = (
          <Button variant="ghost" size="icon" aria-label="Start" className="cursor-pointer">
            <Play />
          </Button>
        );
      }

      return (
        <div className="flex justify-end items-center gap-4">
          {action}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                {row.original.startupEnabled ? (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label="Start"
                      className="cursor-pointer"
                    >
                      <Repeat />
                    </Button>
                    <TooltipContent>Remove from startup</TooltipContent>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Start"
                      className="cursor-pointer"
                    >
                      <Repeat className="text-muted-foreground" />
                    </Button>
                    <TooltipContent>Add to startup</TooltipContent>
                  </>
                )}
              </TooltipTrigger>
            </Tooltip>
          </TooltipProvider>

          <RowActions row={row} />
        </div>
      );
    },
    meta: {
      className: 'pr-8',
    },
  },
];
