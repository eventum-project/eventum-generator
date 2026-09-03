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
});
