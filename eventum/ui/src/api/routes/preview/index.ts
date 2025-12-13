import { InputPluginsNamedConfig } from '../generator-configs/schemas';
import { EventPluginNamedConfig } from '../generator-configs/schemas/plugins/event';
import {
  AggregatedTimestamps,
  AggregatedTimestampsSchema,
  ProduceParams,
  ProducedEventsInfo,
  ProducedEventsInfoSchema,
  VersatileDatetimeParametersBody,
  VersatileDatetimeResponse,
  VersatileDatetimeResponseSchema,
} from './schemas';
import { apiClient } from '@/api/client';
import { validateResponse } from '@/api/wrappers';

export async function generateTimestamps(
  name: string,
  size: number,
  skipPast: boolean,
  timezone: string,
  span: string | null,
  inputPluginsConfig: InputPluginsNamedConfig
): Promise<AggregatedTimestamps> {
  return await validateResponse(
    AggregatedTimestampsSchema,
    apiClient.post(
      `/preview/${name}/input-plugins/generate`,
      inputPluginsConfig,
      {
        params: {
          size,
          skip_past: skipPast,
          timezone,
          span,
        },
      }
    )
  );
}

export async function initializeEventPlugin(
  name: string,
  eventPluginConfig: EventPluginNamedConfig
) {
  await apiClient.post(`/preview/${name}/event-plugin`, eventPluginConfig);
}

export async function releaseEventPlugin(name: string) {
  await apiClient.delete(`/preview/${name}/event-plugin`);
}

export async function produceEvents(
  name: string,
  produceParams: ProduceParams
): Promise<ProducedEventsInfo> {
  return await validateResponse(
    ProducedEventsInfoSchema,
    apiClient.post(`/preview/${name}/event-plugin/produce`, produceParams)
  );
}

export async function normalizeVersatileDatetime(
  name: string,
  parameters: VersatileDatetimeParametersBody
): Promise<VersatileDatetimeResponse> {
  return await validateResponse(
    VersatileDatetimeResponseSchema,
    apiClient.post(`/preview/${name}/versatile-datetime/normalize`, parameters)
  );
}
