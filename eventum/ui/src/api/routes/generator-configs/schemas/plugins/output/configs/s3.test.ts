import { describe, expect, it } from 'vitest';

import { S3OutputPluginConfigSchema } from './s3';

/**
 * Configurations as the server serves them back, so a schema stricter than
 * the backend is caught here rather than by a project that will not open.
 */
function config(overrides: Record<string, unknown> = {}) {
  return {
    bucket: 'eventum-test',
    key_template: 'year={year}/month={month}/{timestamp}-{uuid}{ext}',
    encoder: { format: 'jsonl' },
    ...overrides,
  };
}

describe('S3OutputPluginConfigSchema', () => {
  it('accepts the shape the server returns', () => {
    const result = S3OutputPluginConfigSchema.safeParse(
      config({
        endpoint_url: 'http://127.0.0.1:9000/',
        access_key_id: 'eventum',
        secret_access_key: 'eventum-secret',
        encoder: { format: 'jsonl', compression: 'gzip' },
      })
    );

    expect(result.success).toBe(true);
  });

  it.each([
    ['an IP address', 'http://127.0.0.1:9000/'],
    ['localhost', 'http://localhost:9000'],
    ['a container name', 'http://minio:9000'],
    ['a domain', 'https://s3.eu-west-1.amazonaws.com'],
    ['a private domain', 'https://storage.internal.example.com'],
  ])('takes an endpoint at %s', (_label, endpoint_url) => {
    expect(
      S3OutputPluginConfigSchema.safeParse(config({ endpoint_url })).success
    ).toBe(true);
  });

  it.each([
    ['a bare word', 'not-a-url'],
    ['another scheme', 'ftp://example.com'],
  ])('refuses an endpoint that is %s', (_label, endpoint_url) => {
    expect(
      S3OutputPluginConfigSchema.safeParse(config({ endpoint_url })).success
    ).toBe(false);
  });

  it('takes a proxy at an IP address', () => {
    expect(
      S3OutputPluginConfigSchema.safeParse(
        config({ proxy_url: 'http://10.0.0.1:3128' })
      ).success
    ).toBe(true);
  });

  it('takes a placeholder in place of an endpoint', () => {
    expect(
      S3OutputPluginConfigSchema.safeParse(
        config({ endpoint_url: '${params.endpoint}' })
      ).success
    ).toBe(true);
  });

  it('accepts a parquet encoder as the server returns it', () => {
    const result = S3OutputPluginConfigSchema.safeParse(
      config({
        encoder: {
          format: 'parquet',
          compression: 'zstd',
          row_group_size: 5000,
          schema_path: 'schema/event.json',
        },
      })
    );

    expect(result.success).toBe(true);
  });

  it('drops an encoder field of the other format instead of refusing it', () => {
    // rejecting what the backend rejects is the backend's job: a mirror
    // stricter than the server turns a valid project into one that will
    // not open at all
    const result = S3OutputPluginConfigSchema.safeParse(
      config({ encoder: { format: 'jsonl', row_group_size: 5000 } })
    );

    expect(result.success).toBe(true);
    expect(result.data?.encoder).toEqual({ format: 'jsonl' });
  });
});
