import { describe, expect, it } from 'vitest';

import { HTTPOutputPluginConfigSchema } from './http';

/**
 * Configurations as the server serves them back, so a schema stricter than
 * the backend is caught here rather than by a project that will not open.
 */
describe('HTTPOutputPluginConfigSchema', () => {
  it('takes a url at a local address', () => {
    const result = HTTPOutputPluginConfigSchema.safeParse({
      url: 'http://127.0.0.1:8080/ingest',
    });

    expect(result.success).toBe(true);
  });

  it('takes a proxy at a local address', () => {
    const result = HTTPOutputPluginConfigSchema.safeParse({
      url: 'https://collector.example.com',
      proxy_url: 'http://10.0.0.1:3128',
    });

    expect(result.success).toBe(true);
  });

  it('refuses a url that is not one', () => {
    const result = HTTPOutputPluginConfigSchema.safeParse({
      url: 'not-a-url',
    });

    expect(result.success).toBe(false);
  });
});
