import z from 'zod';

import {
  ReplayEventPluginConfigSchema,
  ReplayEventPluginNamedConfigSchema,
} from './configs/replay';
import {
  ScriptEventPluginConfigSchema,
  ScriptEventPluginNamedConfigSchema,
} from './configs/script';
import {
  TemplateEventPluginConfigSchema,
  TemplateEventPluginNamedConfig,
} from './configs/template';

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
