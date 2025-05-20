import { LightIndicatorProps } from '@/components/common/LightIndicator';

export enum GeneratorStatus {
  Starting = 'starting',
  Running = 'running',
  NotRunning = 'not running',
  Exited0 = 'exited 0',
  Exited1 = 'exited 1',
}

type GeneratorStatusInfo = {
  label: string;
  indicatorProps: LightIndicatorProps;
};

export const GENERATOR_STATUSES: Record<GeneratorStatus, GeneratorStatusInfo> = {
  [GeneratorStatus.Starting]: {
    label: 'Starting',
    indicatorProps: { color: 'orange' },
  },
  [GeneratorStatus.Running]: {
    label: 'Running',
    indicatorProps: { color: 'green' },
  },
  [GeneratorStatus.NotRunning]: {
    label: 'Not running',
    indicatorProps: { color: 'inactive' },
  },
  [GeneratorStatus.Exited0]: {
    label: 'Exited (0)',
    indicatorProps: { color: 'greenInactive' },
  },
  [GeneratorStatus.Exited1]: {
    label: 'Exited (1)',
    indicatorProps: { color: 'redInactive' },
  },
};
