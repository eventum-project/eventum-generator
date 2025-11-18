import z from 'zod';

export const VersatileDatetimeParametersBodySchema = z.object({
  value: z.string().nullable().optional(),
  timezone: z.string().min(1),
  relative_base: z.string().nullable().optional(),
  none_point: z
    .union([z.literal('now'), z.literal('min'), z.literal('max')])
    .optional(),
});
export type VersatileDatetimeParametersBody = z.infer<
  typeof VersatileDatetimeParametersBodySchema
>;

export const VersatileDatetimeResponseSchema = z.string();
export type VersatileDatetimeResponse = z.infer<
  typeof VersatileDatetimeResponseSchema
>;
