import { describe, expect, it } from 'vitest';

import { OpensearchOutputPluginConfigSchema } from './opensearch';

/**
 * Configurations as the server serves them back, so a schema stricter than
 * the backend is caught here rather than by a project that will not open.
 */
function config(overrides: Record<string, unknown> = {}) {
  return {
    hosts: ['https://opensearch.example.com:9200'],
    username: 'admin',
    password: 'admin',
    index: 'events',
    ...overrides,
  };
}

describe('OpensearchOutputPluginConfigSchema', () => {
  it.each([
    ['an IP address', 'https://127.0.0.1:9200'],
    ['a container name', 'http://opensearch:9200'],
    ['an IPv6 literal', 'https://[::1]:9200'],
  ])('takes a host at %s', (_label, host) => {
    expect(
      OpensearchOutputPluginConfigSchema.safeParse(config({ hosts: [host] }))
        .success
    ).toBe(true);
  });

  it('takes a proxy at a local address', () => {
    expect(
      OpensearchOutputPluginConfigSchema.safeParse(
        config({ proxy_url: 'http://10.0.0.1:3128' })
      ).success
    ).toBe(true);
  });

  it('refuses an empty host list', () => {
    expect(
      OpensearchOutputPluginConfigSchema.safeParse(config({ hosts: [] }))
        .success
    ).toBe(false);
  });
});
