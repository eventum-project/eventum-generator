import z from 'zod';

const ValidationErrorInfoSchema = z.object({
  input: z.string().optional(),
  loc: z.array(z.string()),
  msg: z.string(),
  type: z.string(),
});

export const ValidationErrorDetailsSchema = z.object({
  detail: z.array(ValidationErrorInfoSchema),
});

export type ValidationErrorDetails = z.infer<
  typeof ValidationErrorDetailsSchema
>;
