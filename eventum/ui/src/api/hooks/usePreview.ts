import { useMutation } from '@tanstack/react-query';

import { normalizeVersatileDatetime } from '../routes/preview';
import { VersatileDatetimeParametersBody } from '../routes/preview/schemas';

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
