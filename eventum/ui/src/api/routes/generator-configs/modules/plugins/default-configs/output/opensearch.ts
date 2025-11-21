import { OpensearchOutputPluginConfig } from '@/api/routes/generator-configs/schemas/plugins/output/configs/opensearch';

export const OpensearchOutputPluginDefaultConfig: OpensearchOutputPluginConfig =
  {
    hosts: ['https://data-node:9200'],
    username: 'admin',
    // eslint-disable-next-line sonarjs/no-hardcoded-passwords
    password: 'admin',
    index: 'generated_data',
  };
