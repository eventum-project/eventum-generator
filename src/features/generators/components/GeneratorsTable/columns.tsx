'use client';

import { LightIndicator } from '@/components/common/LightIndicator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ColumnDef } from '@tanstack/react-table';

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
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
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
        <div className="flex w-[100px] items-center space-x-2">
          <LightIndicator {...status.indicatorProps} />
          <span>{status.label}</span>
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
      return (
        <div className="flex space-x-2">
          <span className="max-w-[300px] truncate font-medium">{row.getValue('lastStarted')}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'created',
    header: ({ column }) => <ColumnHeader column={column} title="Created" />,
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[300px] truncate font-medium">{row.getValue('created')}</span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <RowActions row={row} />,
  },
];
