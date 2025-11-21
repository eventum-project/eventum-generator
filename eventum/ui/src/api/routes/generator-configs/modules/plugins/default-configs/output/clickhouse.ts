import { ClickhouseOutputPluginConfig } from '@/api/routes/generator-configs/schemas/plugins/output/configs/clickhouse';

export const ClickhouseOutputPluginDefaultConfig: ClickhouseOutputPluginConfig =
  {
    host: '127.0.0.1',
    port: 8123,
    table: 'generated_data',
  };
