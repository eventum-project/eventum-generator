import { describe, expect, it } from 'vitest';

import {
  Format,
  FormatterConfigSchema,
  SYSLOG_FACILITIES,
  SYSLOG_SEVERITIES,
} from './formatters';

/**
 * The syslog names carry their RFC code by position - the form maps a
 * config written as a code back to a name through the index - so the
 * order of these lists is part of the contract, not presentation.
 */
describe('syslog code tables', () => {
  it('lists every facility in the order of its code', () => {
    expect(SYSLOG_FACILITIES).toHaveLength(24);
    expect(SYSLOG_FACILITIES[0]).toBe('kern');
    expect(SYSLOG_FACILITIES[1]).toBe('user');
    expect(SYSLOG_FACILITIES[4]).toBe('auth');
    expect(SYSLOG_FACILITIES[9]).toBe('cron');
    expect(SYSLOG_FACILITIES[16]).toBe('local0');
    expect(SYSLOG_FACILITIES[23]).toBe('local7');
  });

  it('lists every severity in the order of its code', () => {
    expect(SYSLOG_SEVERITIES).toEqual([
      'emerg',
      'alert',
      'crit',
      'err',
      'warning',
      'notice',
      'info',
      'debug',
    ]);
  });
});

describe('SyslogFormatterConfigSchema', () => {
  const parse = (config: Record<string, unknown>) =>
    FormatterConfigSchema.safeParse({ format: Format.Syslog, ...config });

  it('takes a config of every header part', () => {
    expect(
      parse({
        rfc: 5424,
        facility: 'local0',
        severity: { field: 'log.level' },
        hostname: 'web-01',
        app_name: 'nginx',
        procid: '4242',
        msgid: 'access',
        timestamp: { field: '@timestamp' },
        structured_data: [{ id: 'origin@32473', params: { env: 'staging' } }],
        message_field: 'message',
        bom: true,
      }).success
    ).toBe(true);
  });

  it.each([
    ['facility', '${params.facility}'],
    ['severity', '${params.severity}'],
    ['message_format', '${params.message_format}'],
    ['rfc', '${params.rfc}'],
    ['bom', '${params.bom}'],
  ])('takes a placeholder for %s', (field, value) => {
    expect(parse({ [field]: value }).success).toBe(true);
  });

  it.each([
    ['hostname', 256],
    ['app_name', 49],
    ['procid', 129],
    ['msgid', 33],
  ])('rejects a %s over the length the RFC allows', (field, length) => {
    expect(parse({ [field]: 'a'.repeat(length) }).success).toBe(false);
    expect(parse({ [field]: 'a'.repeat(length - 1) }).success).toBe(true);
  });

  it.each(['has space', 'has"quote', 'has]bracket', 'has=equals'])(
    'rejects %s as a structured data id',
    (id) => {
      expect(parse({ structured_data: [{ id }] }).success).toBe(false);
    }
  );

  it('rejects a header part carrying a space', () => {
    expect(parse({ hostname: 'web 01' }).success).toBe(false);
  });

  it('rejects a facility outside the codes', () => {
    expect(parse({ facility: 24 }).success).toBe(false);
    expect(parse({ facility: 23 }).success).toBe(true);
  });
});
