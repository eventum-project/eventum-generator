import z from 'zod';

export type EventPluginName = 'template' | 'replay' | 'script';

export const BaseEventPluginConfigSchema = z.object({});
