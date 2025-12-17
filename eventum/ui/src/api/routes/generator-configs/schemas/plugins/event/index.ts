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
  TemplateEventPluginNamedConfigSchema,
} from './configs/template';

export const EventPluginNamedConfigSchema = z.union([
  TemplateEventPluginNamedConfigSchema,
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
