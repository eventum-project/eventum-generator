import { z } from 'zod';

export const InstanceInfoSchema = z.object({
  app_version: z.string(),
  python_version: z.string(),
  python_implementation: z.string(),
  python_compiler: z.string(),
  platform: z.string(),
  host_name: z.string(),
  host_ip_v4: z.string(),
  boot_timestamp: z.number(),
  cpu_count: z.number().nullable(),
  cpu_frequency_mhz: z.number(),
  cpu_percent: z.number(),
  memory_total_bytes: z.number().int(),
  memory_used_bytes: z.number().int(),
  memory_available_bytes: z.number().int(),
  network_sent_bytes: z.number().int(),
  network_received_bytes: z.number().int(),
  disk_written_bytes: z.number().int(),
  disk_read_bytes: z.number().int(),
  uptime: z.number(),
});

export type InstanceInfo = z.infer<typeof InstanceInfoSchema>;
