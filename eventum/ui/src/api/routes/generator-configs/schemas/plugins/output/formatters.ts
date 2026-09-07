import z from 'zod';

import { orPlaceholder } from '../../placeholder';

export const enum Format {
  Plain = 'plain',
  JSON = 'json',
  JSONBatch = 'json-batch',
  Template = 'template',
  TemplateBatch = 'template-batch',
  EventumHTTPInput = 'eventum-http-input',
  Syslog = 'syslog',
}

const SimpleFormatterConfigSchema = z.object({
  format: z.union([
    z.literal(Format.Plain),
    z.literal(Format.EventumHTTPInput),
  ]),
});

const JSONFormatterConfigSchema = z.object({
  format: z.union([z.literal(Format.JSON), z.literal(Format.JSONBatch)]),
  indent: z.number().int().gte(0).optional(),
});

const TemplateFormatterConfigSchema = z.object({
  format: z.union([
    z.literal(Format.Template),
    z.literal(Format.TemplateBatch),
  ]),
  template: z.string().min(1).nullable().optional(),
  template_path: z.string().min(1).nullable().optional(),
});

/** Facility names of a syslog message, in the order of their codes. */
export const SYSLOG_FACILITIES = [
  'kern',
  'user',
  'mail',
  'daemon',
  'auth',
  'syslog',
  'lpr',
  'news',
  'uucp',
  'cron',
  'authpriv',
  'ftp',
  'ntp',
  'audit',
  'console',
  'solaris-cron',
  'local0',
  'local1',
  'local2',
  'local3',
  'local4',
  'local5',
  'local6',
  'local7',
] as const;

/** Severity names of a syslog message, in the order of their codes. */
export const SYSLOG_SEVERITIES = [
  'emerg',
  'alert',
  'crit',
  'err',
  'warning',
  'notice',
  'info',
  'debug',
] as const;

/** Specifications a syslog message is built after. */
export const SYSLOG_RFCS = [5424, 3164] as const;

/** Renderings of the event as the message part of a syslog line. */
export const SYSLOG_MESSAGE_FORMATS = ['plain', 'json'] as const;

/**
 * Characters a syslog header part carries: printable ASCII ones, with
 * the space excluded as a separator of the parts.
 */
const PRINTABLE_ASCII = /^[!-~]+$/;

/**
 * Characters a structured data id or parameter name carries: printable
 * ASCII ones without `=`, `"`, `]` and the space.
 */
const SD_NAME = /^(?:(?!["=\]])[!-~])+$/;

export const EventFieldRefSchema = z.object({
  field: z.string().min(1),
});
export type EventFieldRef = z.infer<typeof EventFieldRefSchema>;

const headerPart = (maxLength: number) =>
  z.union([
    z.string().min(1).max(maxLength).regex(PRINTABLE_ASCII),
    EventFieldRefSchema,
  ]);

export const SyslogStructuredDataSchema = z.object({
  id: z.string().min(1).max(32).regex(SD_NAME),
  params: z
    .record(
      z.string().min(1).max(32).regex(SD_NAME),
      z.union([z.string(), EventFieldRefSchema])
    )
    .optional(),
});
export type SyslogStructuredData = z.infer<typeof SyslogStructuredDataSchema>;

const SyslogFormatterConfigSchema = z.object({
  format: z.literal(Format.Syslog),
  rfc: orPlaceholder(z.union([z.literal(5424), z.literal(3164)])).optional(),
  facility: orPlaceholder(
    z.union([
      z.enum(SYSLOG_FACILITIES),
      z.number().int().gte(0).lte(23),
      EventFieldRefSchema,
    ])
  ).optional(),
  severity: orPlaceholder(
    z.union([
      z.enum(SYSLOG_SEVERITIES),
      z.number().int().gte(0).lte(7),
      EventFieldRefSchema,
    ])
  ).optional(),
  hostname: headerPart(255).optional(),
  app_name: headerPart(48).optional(),
  procid: headerPart(128).optional(),
  msgid: headerPart(32).optional(),
  timestamp: EventFieldRefSchema.nullable().optional(),
  structured_data: z.array(SyslogStructuredDataSchema).optional(),
  message_field: z.string().min(1).nullable().optional(),
  message_format: orPlaceholder(z.enum(SYSLOG_MESSAGE_FORMATS)).optional(),
  bom: orPlaceholder(z.boolean()).optional(),
});
export type SyslogFormatterConfig = z.infer<typeof SyslogFormatterConfigSchema>;

export const FormatterConfigSchema = z.discriminatedUnion('format', [
  SimpleFormatterConfigSchema,
  JSONFormatterConfigSchema,
  TemplateFormatterConfigSchema,
  SyslogFormatterConfigSchema,
]);
export type FormatterConfig = z.infer<typeof FormatterConfigSchema>;
