import { useMutation } from '@tanstack/react-query';

import { InputPluginsNamedConfig } from '../routes/generator-configs/schemas';
import {
  generateTimestamps,
  normalizeVersatileDatetime,
} from '../routes/preview';
import { VersatileDatetimeParametersBody } from '../routes/preview/schemas';

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
