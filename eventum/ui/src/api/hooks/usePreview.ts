import { useMutation } from '@tanstack/react-query';

import { InputPluginsNamedConfig } from '../routes/generator-configs/schemas';
import { EventPluginNamedConfig } from '../routes/generator-configs/schemas/plugins/event';
import {
  generateTimestamps,
  initializeEventPlugin,
  normalizeVersatileDatetime,
  produceEvents,
  releaseEventPlugin,
} from '../routes/preview';
import {
  ProduceParamsBody,
  VersatileDatetimeParametersBody,
} from '../routes/preview/schemas';

export function useGenerateTimestampsMutation() {
  return useMutation({
    mutationFn: ({
      name,
      size,
      skipPast,
      timezone,
      span,
      inputPluginsConfig,
    }: {
      name: string;
      size: number;
      skipPast: boolean;
      timezone: string;
      span: string | null;
      inputPluginsConfig: InputPluginsNamedConfig;
    }) =>
      generateTimestamps(
        name,
        size,
        skipPast,
        timezone,
        span,
        inputPluginsConfig
      ),
  });
}

export function useInitializeEventPluginMutation() {
  return useMutation({
    mutationFn: ({
      name,
      eventPluginConfig,
    }: {
      name: string;
      eventPluginConfig: EventPluginNamedConfig;
    }) => initializeEventPlugin(name, eventPluginConfig),
  });
}

export function useReleaseEventPluginMutation() {
  return useMutation({
    mutationFn: ({ name }: { name: string }) => releaseEventPlugin(name),
  });
}

export function useProduceEventsMutation() {
  return useMutation({
    mutationFn: ({
      name,
      produceParams,
    }: {
      name: string;
      produceParams: ProduceParamsBody;
    }) => produceEvents(name, produceParams),
  });
}

export function useNormalizedVersatileDatetimeMutation() {
  return useMutation({
    mutationFn: ({
      name,
      parameters,
    }: {
      name: string;
      parameters: VersatileDatetimeParametersBody;
    }) => normalizeVersatileDatetime(name, parameters),
  });
}
