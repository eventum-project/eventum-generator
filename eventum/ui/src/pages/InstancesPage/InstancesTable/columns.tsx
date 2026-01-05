import {
  ActionIcon,
  Checkbox,
  DefaultMantineColor,
  Group,
  Indicator,
  Text,
} from '@mantine/core';
import { IconDotsVertical } from '@tabler/icons-react';
import { createColumnHelper } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import { dirname } from 'pathe';

import { RowActions } from './RowActions';
import {
  GeneratorStatus,
  GeneratorsInfo,
} from '@/api/routes/generators/schemas';

const columnHelper = createColumnHelper<GeneratorsInfo[number]>();

export const columns = [
  columnHelper.display({
    id: 'select',
    cell: ({ row }) => {
      return (
        <Checkbox
          title="Select instance"
          size="xs"
          checked={row.getIsSelected()}
          onChange={(e) => {
            row.toggleSelected(e.currentTarget.checked);
          }}
        />
      );
    },
    meta: {
      style: { width: '1%', whiteSpace: 'nowrap' },
    },
  }),
  columnHelper.accessor('id', {
    header: 'Instance',
    id: 'id',
    enableSorting: true,
    enableColumnFilter: true,
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('path', {
    header: 'Project',
    id: 'path',
    enableSorting: true,
    enableColumnFilter: true,
    filterFn: (row, columnId, filterValue: string) => {
      const rowValue: string = row.getValue(columnId);
      const projectName = dirname(rowValue);
      return projectName.includes(filterValue);
    },
    cell: (info) => dirname(info.getValue()),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    id: 'status',
    enableColumnFilter: true,
    filterFn: (row, columnId, filterValue: boolean) => {
      const rowValue: GeneratorStatus = row.getValue(columnId);

      if (!filterValue) {
        return true;
      }

      return rowValue.is_running;
    },
    cell: (info) => {
      const status = info.getValue();

      let text = 'Not started';
      let color: DefaultMantineColor = 'gray.6';
      let processing = false;

      if (status.is_initializing) {
        text = 'Starting';
        color = 'yellow.7';
        processing = true;
      } else if (status.is_running) {
        text = 'Running';
        color = 'green.6';
      } else if (status.is_stopping) {
        text = 'Stopping';
        color = 'yellow.7';
        processing = true;
      } else if (status.is_ended_up) {
        text = 'Finished';

        if (status.is_ended_up_successfully) {
          color = '#1c5427';
        } else {
          color = '#910606';
        }
      }

      return (
        <Group gap="sm" align="center">
          <Indicator
            color={color}
            size={8}
            position="middle-center"
            processing={processing}
          />
          <Text size="sm">{text}</Text>
        </Group>
      );
    },
  }),
  columnHelper.accessor('start_time', {
    header: 'Last start time',
    id: 'start_time',
    enableSorting: true,
    cell: (info) => {
      const lastStarted = info.getValue();

      if (lastStarted === null) {
        return <>-</>;
      }

      return (
        <>
          {formatDistanceToNow(Date.parse(lastStarted), {
            addSuffix: true,
            includeSeconds: true,
          })}
        </>
      );
    },
    meta: {
      style: { width: '20%' },
    },
  }),
  columnHelper.display({
    id: 'actions',
    cell: ({ row }) => {
      const original = row.original;
      return (
        <RowActions
          target={
            <ActionIcon variant="transparent">
              <IconDotsVertical size={20} />
            </ActionIcon>
          }
          instanceId={original.id}
          instanceStatus={original.status}
        />
      );
    },
    meta: {
      style: { width: '1%', whiteSpace: 'nowrap' },
    },
  }),
];
