import z from 'zod';

import { BaseInputPluginConfigSchema } from '../base-config';
import { VersatileDatetimeSchema } from '../versatile-datetime';

export const TimePatternsInputPluginConfigSchema =
  BaseInputPluginConfigSchema.extend({
    patterns: z.array(z.string()).min(1),
  });
export type TimePatternsInputPluginConfig = z.infer<
  typeof TimePatternsInputPluginConfigSchema
>;
export const TimePatternsInputPluginNamedConfigSchema = z.object({
  time_patterns: TimePatternsInputPluginConfigSchema,
});

export const TIME_UNITS = [
  'weeks',
  'days',
  'hours',
  'minutes',
  'seconds',
  'milliseconds',
  'microseconds',
];

const OscillatorConfigSchema = z.object({
  period: z.number().gt(0),
  unit: z.enum(TIME_UNITS),
  start: VersatileDatetimeSchema,
  end: VersatileDatetimeSchema,
});

const MultiplierConfigSchema = z.object({
  ratio: z.int().gte(1),
});

export const RANDOMIZER_DIRECTION = ['decrease', 'increase', 'mixed'];

const RandomizerConfigSchema = z.object({
  deviation: z.number().gte(0).lte(1),
  direction: z.enum(RANDOMIZER_DIRECTION),
  sampling: z.int().gte(16).optional(),
});

export const BetaDistributionParametersSchema = z.object({
  a: z.number().gte(0),
  b: z.number().gte(0),
});

export const TriangularDistributionParametersSchema = z.object({
  left: z.number().gte(0).lt(1),
  mode: z.number().gte(0).lte(1),
  right: z.number().gt(0).lte(1),
});

export const UniformDistributionParametersSchema = z.object({
  low: z.number().gte(0).lt(1),
  high: z.number().gt(0).lte(1),
});

export const enum Distribution {
  UNIFORM = 'uniform',
  TRIANGULAR = 'triangular',
  BETA = 'beta',
}

const UniformSpreaderConfigSchema = z.object({
  distribution: z.literal(Distribution.UNIFORM),
  parameters: UniformDistributionParametersSchema,
});

const TriangularSpreaderConfigSchema = z.object({
  distribution: z.literal(Distribution.TRIANGULAR),
  parameters: TriangularDistributionParametersSchema,
});

const BetaSpreaderConfigSchema = z.object({
  distribution: z.literal(Distribution.BETA),
  parameters: BetaDistributionParametersSchema,
});

const SpreaderConfigSchema = z.discriminatedUnion('distribution', [
  UniformSpreaderConfigSchema,
  TriangularSpreaderConfigSchema,
  BetaSpreaderConfigSchema,
]);

export const TimePatternConfigSchema = z.object({
  label: z.string().min(1),
  oscillator: OscillatorConfigSchema,
  multiplier: MultiplierConfigSchema,
  randomizer: RandomizerConfigSchema,
  spreader: SpreaderConfigSchema,
});
export type TimePatternConfig = z.infer<typeof TimePatternConfigSchema>;
