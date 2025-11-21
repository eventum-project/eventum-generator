import z from 'zod';

export const VersatileDatetimeStrictSchema = z.string();
export const VersatileDatetimeSchema = VersatileDatetimeStrictSchema.nullable();
