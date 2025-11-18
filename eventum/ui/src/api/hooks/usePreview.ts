import { useMutation } from '@tanstack/react-query';

import { InputPluginsNamedConfig } from '../routes/generator-configs/schemas';
import {
  generateTimestamps,
  normalizeVersatileDatetime,
} from '../routes/preview';
import { VersatileDatetimeParametersBody } from '../routes/preview/schemas';

export function useGenerateTimestampMutation() {
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
      span: string;
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
