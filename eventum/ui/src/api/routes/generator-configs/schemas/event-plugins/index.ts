import { z } from 'zod';

import { ENCODINGS } from '../encodings';
import { ConditionSchema } from './template-fsm-conditions';

const BaseEventPluginConfigSchema = z.object({});

/* Template event plugin */
const enum SampleType {
  Items = 'items',
  CSV = 'csv',
  JSON = 'json',
}

export const enum TemplatePickingMode {
  All = 'all',
  Any = 'any',
  Chance = 'chance',
  Spin = 'spin',
  FSM = 'fsm',
  Chain = 'chain',
}

const ItemsSampleConfigSchema = z.object({
  type: z.literal(SampleType.Items),
  source: z.array(z.any()).min(1),
});

const CSVSampleConfigSchema = z.object({
  type: z.literal(SampleType.CSV),
  header: z.boolean().optional(),
  delimiter: z.string().min(1),
  source: z.string().endsWith('.csv'),
});

const JSONSampleConfigSchema = z.object({
  type: z.literal(SampleType.JSON),
  source: z.string().endsWith('.json'),
});

const SampleConfigSchema = z.union([
  ItemsSampleConfigSchema,
  CSVSampleConfigSchema,
  JSONSampleConfigSchema,
]);

const TemplateConfigForGeneralModesSchema = z.object({
  template: z.string().endsWith('.jinja'),
});

const TemplateConfigForChanceModeSchema =
  TemplateConfigForGeneralModesSchema.extend({
    chance: z.number().gt(0),
  });

const TemplateTransitionSchema = z.object({
  to: z.string().min(1),
  when: ConditionSchema,
});

const TemplateConfigForFSMModeSchema =
  TemplateConfigForGeneralModesSchema.extend({
    transition: TemplateTransitionSchema.nullable().optional(),
    initial: z.boolean().optional(),
  });

const TemplateEventPluginConfigCommonFieldsSchema =
  BaseEventPluginConfigSchema.extend({
    params: z.object().optional(),
    samples: z.record(z.string(), SampleConfigSchema).optional(),
  });

const TemplateEventPluginConfigForGeneralModesSchema =
  TemplateEventPluginConfigCommonFieldsSchema.extend({
    mode: z.union([
      z.literal(TemplatePickingMode.All),
      z.literal(TemplatePickingMode.Any),
      z.literal(TemplatePickingMode.Spin),
    ]),
    templates: z
      .array(z.record(z.string().min(1), TemplateConfigForGeneralModesSchema))
      .min(1),
  });

const TemplateEventPluginConfigForChanceModeSchema =
  TemplateEventPluginConfigCommonFieldsSchema.extend({
    mode: z.literal(TemplatePickingMode.Chance),
    templates: z
      .array(z.record(z.string().min(1), TemplateConfigForChanceModeSchema))
      .min(1),
  });

const TemplateEventPluginConfigForFSMModeSchema =
  TemplateEventPluginConfigCommonFieldsSchema.extend({
    mode: z.literal(TemplatePickingMode.FSM),
    templates: z
      .array(z.record(z.string().min(1), TemplateConfigForFSMModeSchema))
      .min(1),
  });

const TemplateEventPluginConfigForChainModeSchema =
  TemplateEventPluginConfigCommonFieldsSchema.extend({
    mode: z.literal(TemplatePickingMode.Chain),
    chain: z.array(z.string().min(1)).min(1),
    templates: z
      .array(z.record(z.string().min(1), TemplateConfigForGeneralModesSchema))
      .min(1),
  });

const TemplateEventPluginConfigSchema = z.union([
  TemplateEventPluginConfigForGeneralModesSchema,
  TemplateEventPluginConfigForChanceModeSchema,
  TemplateEventPluginConfigForFSMModeSchema,
  TemplateEventPluginConfigForChainModeSchema,
]);
export type TemplateEventPluginConfig = z.infer<
  typeof TemplateEventPluginConfigSchema
>;
export const TemplateEventPluginNamedConfig = z.object({
  template: TemplateEventPluginConfigSchema,
});

/* Replay event plugin */
const ReplayEventPluginConfigSchema = BaseEventPluginConfigSchema.extend({
  path: z.string().min(1),
  timestamp_pattern: z.string().min(1).nullable().optional(),
  timestamp_format: z.string().min(1).nullable().optional(),
  repeat: z.boolean().optional(),
  chunk_size: z.number().int().gte(0).optional(),
  encoding: z.enum(ENCODINGS).optional(),
});
export type ReplayEventPluginConfig = z.infer<
  typeof ReplayEventPluginConfigSchema
>;
export const ReplayEventPluginNamedConfigSchema = z.object({
  replay: ReplayEventPluginConfigSchema,
});

/* Script event plugin */
const ScriptEventPluginConfigSchema = BaseEventPluginConfigSchema.extend({
  path: z.string().min(1),
});
export type ScriptEventPluginConfig = z.infer<
  typeof ScriptEventPluginConfigSchema
>;
export const ScriptEventPluginNamedConfigSchema = z.object({
  script: ScriptEventPluginConfigSchema,
});

export const EventPluginNamedConfigSchema = z.union([
  TemplateEventPluginNamedConfig,
  ReplayEventPluginNamedConfigSchema,
  ScriptEventPluginNamedConfigSchema,
]);
export type EventPluginNamedConfig = z.infer<
  typeof EventPluginNamedConfigSchema
>;

export const EventPluginConfigSchema = z.union([
  TemplateEventPluginConfigSchema,
  ReplayEventPluginConfigSchema,
  ScriptEventPluginConfigSchema,
]);
export type EventPluginConfig = z.infer<typeof EventPluginConfigSchema>;
