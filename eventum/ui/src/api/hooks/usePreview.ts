import { useQuery } from '@tanstack/react-query';

import { normalizeVersatileDatetime } from '../routes/preview';
import { VersatileDatetimeParametersBody } from '../routes/preview/schemas';

const PREVIEW_QUERY_KEY = ['preview'];

const VERSATILE_DATETIME_QUERY_KEY = [
  ...PREVIEW_QUERY_KEY,
  'versatile-datetime',
];

export function useNormalizedVersatileDatetime(
  name: string,
  parameters: VersatileDatetimeParametersBody
) {
  return useQuery({
    queryKey: [...VERSATILE_DATETIME_QUERY_KEY, name],
    queryFn: () => normalizeVersatileDatetime(name, parameters),
    enabled: false,
  });
}
