import z from 'zod';

export const AggregatedTimestampsSchema = z.object({
  span_edges: z.array(z.string()),
  span_counts: z.record(z.string(), z.array(z.int())),
});
export type AggregatedTimestamps = z.infer<typeof AggregatedTimestampsSchema>;

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
