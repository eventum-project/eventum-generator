import { describe, expect, it } from 'vitest';

import { OtlpOutputPluginConfigSchema } from './otlp';

describe('OtlpOutputPluginConfigSchema', () => {
  const base = { endpoint: 'https://collector.example.com' };

  it.each(['json-batch', 'template-batch', 'eventum-http-input'])(
    'rejects the %s formatter',
    (format) => {
      const result = OtlpOutputPluginConfigSchema.safeParse({
        ...base,
        formatter: { format },
      });

      expect(result.success).toBe(false);
    }
  );

  it('accepts a per-event formatter', () => {
    const result = OtlpOutputPluginConfigSchema.safeParse({
      ...base,
      formatter: { format: 'json' },
    });

    expect(result.success).toBe(true);
  });

  it('accepts a config with no formatter set', () => {
    const result = OtlpOutputPluginConfigSchema.safeParse(base);

    expect(result.success).toBe(true);
  });

  // a collector usually runs beside the generator, so the endpoint the
  // server serves back is a local address more often than a domain
  it('takes an endpoint at a local address', () => {
    const result = OtlpOutputPluginConfigSchema.safeParse({
      endpoint: 'http://otelcol:4318',
    });

    expect(result.success).toBe(true);
  });

  it('takes a proxy at a local address', () => {
    const result = OtlpOutputPluginConfigSchema.safeParse({
      ...base,
      proxy_url: 'http://10.0.0.1:3128',
    });

    expect(result.success).toBe(true);
  });

  it('refuses an endpoint that is not a url', () => {
    const result = OtlpOutputPluginConfigSchema.safeParse({
      endpoint: 'not-a-url',
    });

    expect(result.success).toBe(false);
  });
});
