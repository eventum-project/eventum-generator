import { LightIndicatorProps } from '@/components/ui/LightIndicator';

export enum GeneratorStatus {
  Starting = 'starting',
  Running = 'running',
  NotRunning = 'not running',
  Exited0 = 'exited 0',
  Exited1 = 'exited 1',
}

type GeneratorStatusInfo = {
  value: GeneratorStatus;
  label: string;
  indicatorProps: LightIndicatorProps;
};

export const GENERATOR_STATUSES: GeneratorStatusInfo[] = [
  {
    value: GeneratorStatus.Starting,
    label: 'Starting',
    indicatorProps: { color: 'orange' },
  },
  {
    value: GeneratorStatus.Running,
    label: 'Running',
    indicatorProps: { color: 'green' },
  },
  {
    value: GeneratorStatus.NotRunning,
    label: 'Not running',
    indicatorProps: { color: 'gray' },
  },
  {
    value: GeneratorStatus.Exited0,
    label: 'Exited (0)',
    indicatorProps: { color: 'greenInactive' },
  },
  {
    value: GeneratorStatus.Exited1,
    label: 'Exited (1)',
    indicatorProps: { color: 'redInactive' },
  },
];
