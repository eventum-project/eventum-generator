import { z } from 'zod';

import { ENCODINGS } from '../encodings';
import { ConditionSchema } from './jinja-fsm-conditions';

const EventPluginConfigSchema = z.object({});

const enum SampleType {
  Items = 'items',
  CSV = 'csv',
  JSON = 'json',
}

const enum TemplatePickingMode {
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

const JinjaEventPluginConfigCommonFieldsSchema = EventPluginConfigSchema.extend(
  {
    params: z.object().optional(),
    samples: z.record(z.string(), SampleConfigSchema).optional(),
  }
);

const JinjaEventPluginConfigForGeneralModesSchema =
  JinjaEventPluginConfigCommonFieldsSchema.extend({
    mode: z.union([
      z.literal(TemplatePickingMode.All),
      z.literal(TemplatePickingMode.Any),
      z.literal(TemplatePickingMode.Spin),
    ]),
    templates: z
      .array(z.record(z.string().min(1), TemplateConfigForGeneralModesSchema))
      .min(1),
  });

const JinjaEventPluginConfigForChanceModeSchema =
  JinjaEventPluginConfigCommonFieldsSchema.extend({
    mode: z.literal(TemplatePickingMode.Chance),
    templates: z
      .array(z.record(z.string().min(1), TemplateConfigForChanceModeSchema))
      .min(1),
  });

const JinjaEventPluginConfigForFSMModeSchema =
  JinjaEventPluginConfigCommonFieldsSchema.extend({
    mode: z.literal(TemplatePickingMode.FSM),
    templates: z
      .array(z.record(z.string().min(1), TemplateConfigForFSMModeSchema))
      .min(1),
  });

const JinjaEventPluginConfigForChainModeSchema =
  JinjaEventPluginConfigCommonFieldsSchema.extend({
    mode: z.literal(TemplatePickingMode.Chain),
    chain: z.array(z.string().min(1)).min(1),
    templates: z
      .array(z.record(z.string().min(1), TemplateConfigForGeneralModesSchema))
      .min(1),
  });

const JinjaEventPluginConfig = z.union([
  JinjaEventPluginConfigForGeneralModesSchema,
  JinjaEventPluginConfigForChanceModeSchema,
  JinjaEventPluginConfigForFSMModeSchema,
  JinjaEventPluginConfigForChainModeSchema,
]);

export const JinjaEventPluginNamedConfig = z.object({
  jinja: JinjaEventPluginConfig,
});

const ReplayEventPluginConfigSchema = z.object({
  path: z.string().min(1),
  timestamp_pattern: z.string().min(1).nullable().optional(),
  timestamp_format: z.string().min(1).nullable().optional(),
  repeat: z.boolean().optional(),
  chunk_size: z.number().int().gte(0),
  encoding: z.enum(ENCODINGS),
});

export const ReplayEventPluginNamedConfigSchema = z.object({
  replay: ReplayEventPluginConfigSchema,
});

const ScriptEventPluginConfigSchema = z.object({
  path: z.string().min(1),
});

export const ScriptEventPluginNamedConfigSchema = z.object({
  script: ScriptEventPluginConfigSchema,
});

export const EventPluginNamedConfigSchema = z.union([
  JinjaEventPluginNamedConfig,
  ReplayEventPluginNamedConfigSchema,
  ScriptEventPluginNamedConfigSchema,
]);
