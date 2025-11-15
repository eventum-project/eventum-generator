import {
  Icon,
  IconAsteriskSimple,
  IconBraces,
  IconCalendarMonthFilled,
  IconChartBar,
  IconCode,
  IconFileDescription,
  IconList,
  IconNumber100Small,
  IconRepeat,
  IconTallymark4,
  IconTerminal2,
  IconTimeDuration45,
} from '@tabler/icons-react';

import { IconOpenSearch } from '@/components/ui/icons/IconOpenSearch';

export type InputPluginName =
  | 'cron'
  | 'http'
  | 'linspace'
  | 'static'
  | 'time_patterns'
  | 'timer'
  | 'timestamps';

export type EventPluginName = 'template' | 'replay' | 'script';

export type OutputPluginName =
  | 'clickhouse'
  | 'file'
  | 'http'
  | 'opensearch'
  | 'stdout';

export interface PluginInfo {
  label: string;
  icon: Icon;
  description: string;
}

export const INPUT_PLUGINS_INFO = {
  cron: {
    label: 'Cron',
    icon: IconAsteriskSimple,
    description: 'Generate timestamps at moments defined by cron expression',
  },
  http: {
    label: 'HTTP',
    icon: IconCode,
    description: 'Generate timestamps when HTTP request is received',
  },
  linspace: {
    label: 'Linspace',
    icon: IconCalendarMonthFilled,
    description: 'Generate timestamps linearly spaced in date range',
  },
  static: {
    label: 'Static',
    icon: IconNumber100Small,
    description: 'Generate specified number of current timestamps',
  },
  time_patterns: {
    label: 'Time patterns',
    icon: IconChartBar,
    description:
      'Generate events with specific pattern of distribution in time',
  },
  timer: {
    label: 'Timer',
    icon: IconTimeDuration45,
    description: 'Generate timestamps after specified amount of time',
  },
  timestamps: {
    label: 'Timestamps',
    icon: IconList,
    description: 'Generate at specified timestamps',
  },
} as const satisfies Record<InputPluginName, PluginInfo>;

export const EVENT_PLUGINS_INFO = {
  template: {
    label: 'Template',
    icon: IconBraces,
    description: 'Produce events using templates',
  },
  replay: {
    label: 'Replay',
    icon: IconRepeat,
    description: 'Produce events by replaying existing log files',
  },
  script: {
    label: 'Script',
    icon: IconCode,
    description: 'Produce events using Python scripts',
  },
} as const satisfies Record<EventPluginName, PluginInfo>;

export const OUTPUT_PLUGINS_INFO = {
  clickhouse: {
    label: 'ClickHouse',
    icon: IconTallymark4,
    description: 'Index events to ClickHouse',
  },
  file: {
    label: 'File',
    icon: IconFileDescription,
    description: 'Write events to a file',
  },
  http: {
    label: 'HTTP',
    icon: IconCode,
    description: 'Send events using HTTP requests',
  },
  opensearch: {
    label: 'OpenSearch',
    icon: IconOpenSearch,
    description: 'Index events to OpenSearch',
  },
  stdout: {
    label: 'Stdout',
    icon: IconTerminal2,
    description: 'Write events to stdout',
  },
} as const satisfies Record<OutputPluginName, PluginInfo>;
