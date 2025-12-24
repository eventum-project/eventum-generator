import z from 'zod';

export const enum Format {
  Plain = 'plain',
  JSON = 'json',
  JSONBatch = 'json-batch',
  Template = 'template',
  TemplateBatch = 'template-batch',
  EventumHTTPInput = 'eventum-http-input',
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

export const FormatterConfigSchema = z.discriminatedUnion('format', [
  SimpleFormatterConfigSchema,
  JSONFormatterConfigSchema,
  TemplateFormatterConfigSchema,
]);
export type FormatterConfig = z.infer<typeof FormatterConfigSchema>;
