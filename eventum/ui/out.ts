import { makeApi, Zodios, type ZodiosOptions } from "@zodios/core";
import { z } from "zod";

type And_Input = {
  and: Array<Condition_Input>;
};
type ConditionCheck_Input =
  | (
      | Eq
      | Gt
      | Ge
      | Lt
      | Le
      | Matches
      | LenEq
      | LenGt
      | LenGe
      | LenLt
      | LenLe
      | Contains
      | In
      | Before
      | After
      | Defined
      | HasTags
    )
  | Array<
      | Eq
      | Gt
      | Ge
      | Lt
      | Le
      | Matches
      | LenEq
      | LenGt
      | LenGe
      | LenLt
      | LenLe
      | Contains
      | In
      | Before
      | After
      | Defined
      | HasTags
    >;
type Eq = {
  eq: {};
};
type Gt = {
  gt: {};
};
type Ge = {
  ge: {};
};
type Lt = {
  lt: {};
};
type Le = {
  le: {};
};
type Matches = {
  matches: {};
};
type LenEq = {
  len_eq: {};
};
type LenGt = {
  len_gt: {};
};
type LenGe = {
  len_ge: {};
};
type LenLt = {
  len_lt: {};
};
type LenLe = {
  len_le: {};
};
type Contains = {
  contains: {};
};
type In = {
  in: {};
};
type Before = {
  before: TimestampComponents;
};
type TimestampComponents = Partial<{
  year: (number | null) | Array<number | null>;
  month: (number | null) | Array<number | null>;
  day: (number | null) | Array<number | null>;
  hour: (number | null) | Array<number | null>;
  minute: (number | null) | Array<number | null>;
  second: (number | null) | Array<number | null>;
  microsecond: (number | null) | Array<number | null>;
}>;
type After = {
  after: TimestampComponents;
};
type Defined = {
  defined: eventum__plugins__event__plugins__jinja__fsm__fields__StateFieldName__2;
};
type eventum__plugins__event__plugins__jinja__fsm__fields__StateFieldName__2 =
  string;
type HasTags = {
  has_tags: (string | Array<string>) | Array<string | Array<string>>;
};
type And_Output = {
  and: Array<Condition_Output>;
};
type ConditionCheck_Output =
  | (
      | Eq
      | Gt
      | Ge
      | Lt
      | Le
      | Matches
      | LenEq
      | LenGt
      | LenGe
      | LenLt
      | LenLe
      | Contains
      | In
      | Before
      | After
      | Defined
      | HasTags
    )
  | Array<
      | Eq
      | Gt
      | Ge
      | Lt
      | Le
      | Matches
      | LenEq
      | LenGt
      | LenGe
      | LenLt
      | LenLe
      | Contains
      | In
      | Before
      | After
      | Defined
      | HasTags
    >;
type Condition_Input =
  | (ConditionLogic_Input | ConditionCheck_Input)
  | Array<ConditionLogic_Input | ConditionCheck_Input>;
type Condition_Output =
  | (ConditionLogic_Output | ConditionCheck_Output)
  | Array<ConditionLogic_Output | ConditionCheck_Output>;
type ConditionLogic_Input =
  | (Or_Input | And_Input | Not_Input)
  | Array<Or_Input | And_Input | Not_Input>;
type ConditionLogic_Output =
  | (Or_Output | And_Output | Not_Output)
  | Array<Or_Output | And_Output | Not_Output>;
type FileNode = {
  name: string;
  is_dir: boolean;
  children?:
    | ((Array<FileNode> | null) | Array<Array<FileNode> | null>)
    | undefined;
};
type Not_Input = {
  not: Condition_Input;
};
type Not_Output = {
  not: Condition_Output;
};
type Or_Input = {
  or: Array<Condition_Input>;
};
type Or_Output = {
  or: Array<Condition_Output>;
};

const InstanceInfo = z.object({
  app_version: z.string().optional().default("2.0.0"),
  python_version: z.string().optional().default("3.13.2"),
  python_implementation: z.string().optional().default("CPython"),
  python_compiler: z.string().optional().default("Clang 19.1.6 "),
  platform: z
    .string()
    .optional()
    .default("Linux-6.6.87.2-microsoft-standard-WSL2-x86_64-with-glibc2.35"),
  host_name: z.string().optional().default("huawei-laptop"),
  host_ip_v4: z.string().optional().default("127.0.1.1"),
  boot_timestamp: z.number().optional().default(1759058408),
  cpu_count: z.union([z.number(), z.null()]),
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
const SSLParameters_Output = z
  .object({
    enabled: z.boolean().default(true),
    verify_mode: z.enum(["none", "optional", "required"]).default("optional"),
    ca_cert: z.string(),
    cert: z.string(),
    cert_key: z.string(),
  })
  .partial();
const AuthParameters = z
  .object({
    user: z.string().min(1).default("eventum"),
    password: z.string().min(1).default("eventum"),
  })
  .partial();
const APIParameters_Output = z
  .object({
    enabled: z.boolean().default(true),
    host: z.string().min(1).default("0.0.0.0"),
    port: z.number().int().gte(1).default(9474),
    ssl: SSLParameters_Output,
    auth: AuthParameters,
  })
  .partial();
const BatchParameters = z
  .object({
    size: z.union([z.number(), z.null()]).default(10000),
    delay: z.union([z.number(), z.null()]).default(1),
  })
  .partial();
const QueueParameters = z
  .object({
    max_timestamp_batches: z.number().int().gte(1).default(10),
    max_event_batches: z.number().int().gte(1).default(10),
  })
  .partial();
const GenerationParameters = z
  .object({
    timezone: z.string().min(3).default("UTC"),
    batch: BatchParameters,
    queue: QueueParameters,
    keep_order: z.boolean().default(false),
    max_concurrency: z.number().int().default(100),
    write_timeout: z.number().int().gte(1).default(10),
  })
  .partial();
const LogParameters = z
  .object({
    level: z
      .enum(["debug", "info", "warning", "error", "critical"])
      .default("info"),
    format: z.enum(["plain", "json"]).default("plain"),
    max_bytes: z.number().int().gte(1024).default(10485760),
    backups: z.number().int().gte(1).default(5),
  })
  .partial();
const PathParameters_Output = z.object({
  logs: z.string(),
  startup: z.string(),
  generators_dir: z.string(),
  keyring_cryptfile: z.string(),
  generator_config_filename: z.string().optional(),
});
const Settings_Output = z.object({
  api: APIParameters_Output,
  generation: GenerationParameters,
  log: LogParameters,
  path: PathParameters_Output,
});
const SSLParameters_Input = z
  .object({
    enabled: z.boolean().default(true),
    verify_mode: z.enum(["none", "optional", "required"]).default("optional"),
    ca_cert: z.union([z.string(), z.null()]),
    cert: z.union([z.string(), z.null()]),
    cert_key: z.union([z.string(), z.null()]),
  })
  .partial();
const APIParameters_Input = z
  .object({
    enabled: z.boolean().default(true),
    host: z.string().min(1).default("0.0.0.0"),
    port: z.number().int().gte(1).default(9474),
    ssl: SSLParameters_Input,
    auth: AuthParameters,
  })
  .partial();
const PathParameters_Input = z.object({
  logs: z.string(),
  startup: z.string(),
  generators_dir: z.string(),
  keyring_cryptfile: z.string(),
  generator_config_filename: z.string().optional().default("generator.yml"),
});
const Settings_Input = z.object({
  api: APIParameters_Input,
  generation: GenerationParameters,
  log: LogParameters,
  path: PathParameters_Input,
});
const ValidationError = z
  .object({
    loc: z.array(z.union([z.string(), z.number()])),
    msg: z.string(),
    type: z.string(),
  })
  .passthrough();
const HTTPValidationError = z
  .object({ detail: z.array(ValidationError) })
  .partial()
  .passthrough();
const VersatileDatetimeStrict = z.union([z.string(), z.string(), z.string()]);
const CronInputPluginConfig = z.object({
  tags: z.array(z.string()).optional().default([]),
  start: z.union([VersatileDatetimeStrict, z.null()]).optional(),
  end: z.union([VersatileDatetimeStrict, z.null()]).optional(),
  expression: z.string(),
  count: z.number().int().gt(0),
});
const cron_Output = z.object({ cron: CronInputPluginConfig });
const HttpInputPluginConfig = z.object({
  tags: z.array(z.string()).optional().default([]),
  host: z.string().min(1).optional().default("0.0.0.0"),
  port: z.number().int().gte(1),
  max_pending_requests: z.number().int().gte(1).optional().default(100),
});
const eventum__api__routers__generator_configs__runtime_types__http__1 =
  z.object({ http: HttpInputPluginConfig });
const LinspaceInputPluginConfig = z.object({
  tags: z.array(z.string()).optional().default([]),
  start: VersatileDatetimeStrict,
  end: VersatileDatetimeStrict,
  count: z.number().int().gte(1),
  endpoint: z.boolean().optional().default(true),
});
const linspace_Output = z.object({ linspace: LinspaceInputPluginConfig });
const StaticInputPluginConfig = z.object({
  tags: z.array(z.string()).optional().default([]),
  count: z.number().int().gt(0),
});
const static = z.object({ static: StaticInputPluginConfig });
const TimePatternsInputPluginConfig = z.object({
  tags: z.array(z.string()).optional().default([]),
  patterns: z.array(z.string()).min(1),
});
const time_patterns = z.object({
  time_patterns: TimePatternsInputPluginConfig,
});
const TimerInputPluginConfig = z.object({
  tags: z.array(z.string()).optional().default([]),
  start: z.union([VersatileDatetimeStrict, z.null()]).optional(),
  seconds: z.number().gte(0.1),
  count: z.number().int().gte(1),
  repeat: z.union([z.number(), z.null()]).optional(),
});
const timer_Output = z.object({ timer: TimerInputPluginConfig });
const TimestampsInputPluginConfig = z.object({
  tags: z.array(z.string()).optional().default([]),
  source: z.union([z.array(z.string().datetime({ offset: true })), z.string()]),
});
const timestamps = z.object({ timestamps: TimestampsInputPluginConfig });
const InputPluginNamedConfig_Output = z.union([
  cron_Output,
  eventum__api__routers__generator_configs__runtime_types__http__1,
  linspace_Output,
  static,
  time_patterns,
  timer_Output,
  timestamps,
]);
const ItemsSampleConfig = z.object({
  type: z.string(),
  source: z.array(z.unknown()).min(1),
});
const CSVSampleConfig = z.object({
  type: z.string(),
  header: z.boolean().optional().default(false),
  delimiter: z.string().min(1).optional().default(","),
  source: z.string().regex(/.*\.csv/),
});
const JSONSampleConfig = z.object({
  type: z.string(),
  source: z.string().regex(/.*\.json/),
});
const SampleConfig = z.discriminatedUnion("type", [
  ItemsSampleConfig,
  CSVSampleConfig,
  JSONSampleConfig,
]);
const TemplateConfigForGeneralModes = z.object({
  template: z.string().regex(/.*\.jinja/),
});
const JinjaEventPluginConfigForGeneralModes_Output = z.object({
  params: z.object({}).partial().passthrough(),
  samples: z.record(SampleConfig),
  mode: z.enum(["all", "any", "spin"]),
  templates: z.array(z.record(TemplateConfigForGeneralModes)).min(1),
});
const TemplateConfigForChanceMode = z.object({
  template: z.string().regex(/.*\.jinja/),
  chance: z.number().gt(0),
});
const JinjaEventPluginConfigForChanceMode_Output = z.object({
  params: z.object({}).partial().passthrough(),
  samples: z.record(SampleConfig),
  mode: z.string(),
  templates: z.array(z.record(TemplateConfigForChanceMode)).min(1),
});
const Or_Output: z.ZodType<Or_Output> = z.lazy(() =>
  z.object({ or: z.array(Condition_Output).min(2) })
);
const And_Output: z.ZodType<And_Output> = z.lazy(() =>
  z.object({ and: z.array(Condition_Output).min(2) })
);
const Not_Output: z.ZodType<Not_Output> = z.lazy(() =>
  z.object({ not: Condition_Output })
);
const ConditionLogic_Output: z.ZodType<ConditionLogic_Output> = z.lazy(() =>
  z.union([Or_Output, And_Output, Not_Output])
);
const Eq = z.object({ eq: z.object({}).partial().passthrough() });
const Gt = z.object({ gt: z.record(z.union([z.number(), z.number()])) });
const Ge = z.object({ ge: z.record(z.union([z.number(), z.number()])) });
const Lt = z.object({ lt: z.record(z.union([z.number(), z.number()])) });
const Le = z.object({ le: z.record(z.union([z.number(), z.number()])) });
const Matches = z.object({ matches: z.record(z.string()) });
const LenEq = z.object({ len_eq: z.record(z.number().int()) });
const LenGt = z.object({ len_gt: z.record(z.number().int()) });
const LenGe = z.object({ len_ge: z.record(z.number().int()) });
const LenLt = z.object({ len_lt: z.record(z.number().int()) });
const LenLe = z.object({ len_le: z.record(z.number().int()) });
const Contains = z.object({ contains: z.object({}).partial().passthrough() });
const In = z.object({ in: z.object({}).partial().passthrough() });
const TimestampComponents = z
  .object({
    year: z.union([z.number(), z.null()]),
    month: z.union([z.number(), z.null()]),
    day: z.union([z.number(), z.null()]),
    hour: z.union([z.number(), z.null()]),
    minute: z.union([z.number(), z.null()]),
    second: z.union([z.number(), z.null()]),
    microsecond: z.union([z.number(), z.null()]),
  })
  .partial();
const Before = z.object({ before: TimestampComponents });
const After = z.object({ after: TimestampComponents });
const eventum__plugins__event__plugins__jinja__fsm__fields__StateFieldName__2 =
  z.string();
const Defined = z.object({
  defined:
    eventum__plugins__event__plugins__jinja__fsm__fields__StateFieldName__2
      .min(1)
      .regex(/^(locals|shared|globals)\..+$/),
});
const HasTags = z.object({
  has_tags: z.union([z.string(), z.array(z.string())]),
});
const ConditionCheck_Output = z.union([
  Eq,
  Gt,
  Ge,
  Lt,
  Le,
  Matches,
  LenEq,
  LenGt,
  LenGe,
  LenLt,
  LenLe,
  Contains,
  In,
  Before,
  After,
  Defined,
  HasTags,
]);
const Condition_Output: z.ZodType<Condition_Output> = z.lazy(() =>
  z.union([ConditionLogic_Output, ConditionCheck_Output])
);
const TemplateTransition_Output = z.object({
  to: z.string().min(1),
  when: Condition_Output,
});
const TemplateConfigForFSMMode_Output = z.object({
  template: z.string().regex(/.*\.jinja/),
  transition: z.union([TemplateTransition_Output, z.null()]).optional(),
  initial: z.boolean().optional().default(false),
});
const JinjaEventPluginConfigForFSMMode_Output = z.object({
  params: z.object({}).partial().passthrough(),
  samples: z.record(SampleConfig),
  mode: z.string(),
  templates: z.array(z.record(TemplateConfigForFSMMode_Output)).min(1),
});
const JinjaEventPluginConfigForChainMode_Output = z.object({
  params: z.object({}).partial().passthrough(),
  samples: z.record(SampleConfig),
  mode: z.string(),
  chain: z.array(z.string()).min(1),
  templates: z.array(z.record(TemplateConfigForGeneralModes)).min(1),
});
const JinjaEventPluginConfig_Output = z.discriminatedUnion("mode", [
  JinjaEventPluginConfigForGeneralModes_Output,
  JinjaEventPluginConfigForChanceMode_Output,
  JinjaEventPluginConfigForFSMMode_Output,
  JinjaEventPluginConfigForChainMode_Output,
]);
const jinja_Output = z.object({ jinja: JinjaEventPluginConfig_Output });
const Encoding = z.enum([
  "ascii",
  "big5",
  "big5hkscs",
  "cp037",
  "cp273",
  "cp424",
  "cp437",
  "cp500",
  "cp720",
  "cp737",
  "cp775",
  "cp850",
  "cp852",
  "cp855",
  "cp856",
  "cp857",
  "cp858",
  "cp860",
  "cp861",
  "cp862",
  "cp863",
  "cp864",
  "cp865",
  "cp866",
  "cp869",
  "cp874",
  "cp875",
  "cp932",
  "cp949",
  "cp950",
  "cp1006",
  "cp1026",
  "cp1125",
  "cp1140",
  "cp1250",
  "cp1251",
  "cp1252",
  "cp1253",
  "cp1254",
  "cp1255",
  "cp1256",
  "cp1257",
  "cp1258",
  "euc_jp",
  "euc_jis_2004",
  "euc_jisx0213",
  "euc_kr",
  "gb2312",
  "gbk",
  "gb18030",
  "hz",
  "iso2022_jp",
  "iso2022_jp_1",
  "iso2022_jp_2",
  "iso2022_jp_2004",
  "iso2022_jp_3",
  "iso2022_jp_ext",
  "iso2022_kr",
  "latin_1",
  "iso8859_2",
  "iso8859_3",
  "iso8859_4",
  "iso8859_5",
  "iso8859_6",
  "iso8859_7",
  "iso8859_8",
  "iso8859_9",
  "iso8859_10",
  "iso8859_11",
  "iso8859_13",
  "iso8859_14",
  "iso8859_15",
  "iso8859_16",
  "johab",
  "koi8_r",
  "koi8_t",
  "koi8_u",
  "kz1048",
  "mac_cyrillic",
  "mac_greek",
  "mac_iceland",
  "mac_latin2",
  "mac_roman",
  "mac_turkish",
  "ptcp154",
  "shift_jis",
  "shift_jis_2004",
  "shift_jisx0213",
  "utf_32",
  "utf_32_be",
  "utf_32_le",
  "utf_16",
  "utf_16_be",
  "utf_16_le",
  "utf_7",
  "utf_8",
  "utf_8_sig",
]);
const ReplayEventPluginConfig = z.object({
  path: z.string(),
  timestamp_pattern: z.union([z.string(), z.null()]).optional(),
  timestamp_format: z.union([z.string(), z.null()]).optional(),
  repeat: z.boolean().optional().default(false),
  chunk_size: z.number().int().gte(0).optional().default(1048576),
  encoding: Encoding.optional(),
});
const replay_Output = z.object({ replay: ReplayEventPluginConfig });
const ScriptEventPluginConfig = z.object({ path: z.string() });
const script = z.object({ script: ScriptEventPluginConfig });
const EventPluginNamedConfig_Output = z.union([
  jinja_Output,
  replay_Output,
  script,
]);
const SimpleFormatterConfig = z.object({
  format: z.enum(["plain", "eventum-http-input"]),
});
const JsonFormatterConfig = z.object({
  format: z.enum(["json", "json-batch"]),
  indent: z.number().int().gte(0).optional().default(0),
});
const TemplateFormatterConfig = z.object({
  format: z.enum(["template", "template-batch"]),
  template: z.union([z.string(), z.null()]).optional(),
  template_path: z.union([z.string(), z.null()]).optional(),
});
const ClickhouseInputFormat = z.enum([
  "TabSeparated",
  "TabSeparatedRaw",
  "TabSeparatedWithNames",
  "TabSeparatedWithNamesAndTypes",
  "TabSeparatedRawWithNames",
  "TabSeparatedRawWithNamesAndTypes",
  "Template",
  "TemplateIgnoreSpaces",
  "CSV",
  "CSVWithNames",
  "CSVWithNamesAndTypes",
  "CustomSeparated",
  "CustomSeparatedWithNames",
  "CustomSeparatedWithNamesAndTypes",
  "Values",
  "JSON",
  "JSONAsString",
  "JSONAsObject",
  "JSONStrings",
  "JSONColumns",
  "JSONColumnsWithMetadata",
  "JSONCompact",
  "JSONCompactColumns",
  "JSONEachRow",
  "JSONStringsEachRow",
  "JSONCompactEachRow",
  "JSONCompactEachRowWithNames",
  "JSONCompactEachRowWithNamesAndTypes",
  "JSONCompactStringsEachRow",
  "JSONCompactStringsEachRowWithNames",
  "JSONCompactStringsEachRowWithNamesAndTypes",
  "JSONObjectEachRow",
  "BSONEachRow",
  "TSKV",
  "Protobuf",
  "ProtobufSingle",
  "ProtobufList",
  "Avro",
  "AvroConfluent",
  "Parquet",
  "ParquetMetadata",
  "Arrow",
  "ArrowStream",
  "ORC",
  "One",
  "Npy",
  "RowBinary",
  "RowBinaryWithNames",
  "RowBinaryWithNamesAndTypes",
  "RowBinaryWithDefaults",
  "Native",
  "CapnProto",
  "LineAsString",
  "Regexp",
  "RawBLOB",
  "MsgPack",
  "MySQLDump",
  "DWARF",
  "Form",
]);
const ClickhouseOutputPluginConfig = z.object({
  formatter: z
    .discriminatedUnion("format", [
      SimpleFormatterConfig,
      JsonFormatterConfig,
      TemplateFormatterConfig,
    ])
    .optional(),
  host: z.string().min(1),
  port: z.number().int().gte(1).optional().default(8123),
  protocol: z.enum(["http", "https"]).optional().default("http"),
  database: z.string().min(1).optional().default("default"),
  table: z.string().min(1),
  username: z.string().min(1).optional().default("default"),
  password: z.string().optional().default(""),
  dsn: z.union([z.string(), z.null()]).optional(),
  connect_timeout: z.number().int().gte(1).optional().default(10),
  request_timeout: z.number().int().gte(1).optional().default(300),
  client_name: z.union([z.string(), z.null()]).optional(),
  verify: z.boolean().optional().default(true),
  ca_cert: z.union([z.string(), z.null()]).optional(),
  client_cert: z.union([z.string(), z.null()]).optional(),
  client_cert_key: z.union([z.string(), z.null()]).optional(),
  server_host_name: z.union([z.string(), z.null()]).optional(),
  tls_mode: z
    .union([z.enum(["proxy", "strict", "mutual"]), z.null()])
    .optional(),
  proxy_url: z.union([z.string(), z.null()]).optional(),
  input_format: ClickhouseInputFormat.optional(),
  header: z.string().optional().default(""),
  footer: z.string().optional().default(""),
  separator: z.string().optional().default("\n"),
});
const clickhouse_Output = z.object({
  clickhouse: ClickhouseOutputPluginConfig,
});
const FileOutputPluginConfig = z.object({
  formatter: z
    .discriminatedUnion("format", [
      SimpleFormatterConfig,
      JsonFormatterConfig,
      TemplateFormatterConfig,
    ])
    .optional(),
  path: z.string(),
  flush_interval: z.number().gte(0).optional().default(1),
  cleanup_interval: z.number().gte(1).optional().default(10),
  file_mode: z.number().int().gte(0).lte(7777).optional().default(640),
  write_mode: z.enum(["append", "overwrite"]).optional().default("append"),
  encoding: Encoding.optional(),
  separator: z.string().optional().default("\n"),
});
const file_Output = z.object({ file: FileOutputPluginConfig });
const HttpOutputPluginConfig = z.object({
  formatter: z
    .discriminatedUnion("format", [
      SimpleFormatterConfig,
      JsonFormatterConfig,
      TemplateFormatterConfig,
    ])
    .optional(),
  url: z.string().min(1).max(2083).url(),
  method: z
    .enum(["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"])
    .optional()
    .default("POST"),
  success_code: z.number().int().gte(100).optional().default(201),
  headers: z.object({}).partial().passthrough().optional(),
  username: z.union([z.string(), z.null()]).optional(),
  password: z.union([z.string(), z.null()]).optional(),
  connect_timeout: z.number().int().gte(1).optional().default(10),
  request_timeout: z.number().int().gte(1).optional().default(300),
  verify: z.boolean().optional().default(false),
  ca_cert: z.union([z.string(), z.null()]).optional(),
  client_cert: z.union([z.string(), z.null()]).optional(),
  client_cert_key: z.union([z.string(), z.null()]).optional(),
  proxy_url: z.union([z.string(), z.null()]).optional(),
});
const eventum__api__routers__generator_configs__runtime_types__http_Output__2 =
  z.object({ http: HttpOutputPluginConfig });
const OpensearchOutputPluginConfig = z.object({
  formatter: z
    .discriminatedUnion("format", [
      SimpleFormatterConfig,
      JsonFormatterConfig,
      TemplateFormatterConfig,
    ])
    .optional(),
  hosts: z.array(z.string().min(1).max(2083).url()).min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  index: z.string().min(1),
  connect_timeout: z.number().int().gte(1).optional().default(10),
  request_timeout: z.number().int().gte(1).optional().default(300),
  verify: z.boolean().optional().default(false),
  ca_cert: z.union([z.string(), z.null()]).optional(),
  client_cert: z.union([z.string(), z.null()]).optional(),
  client_cert_key: z.union([z.string(), z.null()]).optional(),
  proxy_url: z.union([z.string(), z.null()]).optional(),
});
const opensearch_Output = z.object({
  opensearch: OpensearchOutputPluginConfig,
});
const StdoutOutputPluginConfig = z
  .object({
    formatter: z.discriminatedUnion("format", [
      SimpleFormatterConfig,
      JsonFormatterConfig,
      TemplateFormatterConfig,
    ]),
    flush_interval: z.number().gte(0).default(1),
    stream: z.enum(["stdout", "stderr"]).default("stdout"),
    encoding: Encoding,
    separator: z.string().default("\n"),
  })
  .partial();
const stdout_Output = z.object({ stdout: StdoutOutputPluginConfig });
const OutputPluginNamedConfig_Output = z.union([
  clickhouse_Output,
  file_Output,
  eventum__api__routers__generator_configs__runtime_types__http_Output__2,
  opensearch_Output,
  stdout_Output,
]);
const GeneratorConfig_Output = z.object({
  input: z.array(InputPluginNamedConfig_Output),
  event: EventPluginNamedConfig_Output,
  output: z.array(OutputPluginNamedConfig_Output),
});
const cron_Input = z.object({ cron: CronInputPluginConfig });
const linspace_Input = z.object({ linspace: LinspaceInputPluginConfig });
const timer_Input = z.object({ timer: TimerInputPluginConfig });
const InputPluginNamedConfig_Input = z.union([
  cron_Input,
  eventum__api__routers__generator_configs__runtime_types__http__1,
  linspace_Input,
  static,
  time_patterns,
  timer_Input,
  timestamps,
]);
const JinjaEventPluginConfigForGeneralModes_Input = z.object({
  params: z.object({}).partial().passthrough(),
  samples: z.record(SampleConfig),
  mode: z.enum(["all", "any", "spin"]),
  templates: z.array(z.record(TemplateConfigForGeneralModes)).min(1),
});
const JinjaEventPluginConfigForChanceMode_Input = z.object({
  params: z.object({}).partial().passthrough(),
  samples: z.record(SampleConfig),
  mode: z.string(),
  templates: z.array(z.record(TemplateConfigForChanceMode)).min(1),
});
const Or_Input: z.ZodType<Or_Input> = z.lazy(() =>
  z.object({ or: z.array(Condition_Input).min(2) })
);
const And_Input: z.ZodType<And_Input> = z.lazy(() =>
  z.object({ and: z.array(Condition_Input).min(2) })
);
const Not_Input: z.ZodType<Not_Input> = z.lazy(() =>
  z.object({ not: Condition_Input })
);
const ConditionLogic_Input: z.ZodType<ConditionLogic_Input> = z.lazy(() =>
  z.union([Or_Input, And_Input, Not_Input])
);
const ConditionCheck_Input = z.union([
  Eq,
  Gt,
  Ge,
  Lt,
  Le,
  Matches,
  LenEq,
  LenGt,
  LenGe,
  LenLt,
  LenLe,
  Contains,
  In,
  Before,
  After,
  Defined,
  HasTags,
]);
const Condition_Input: z.ZodType<Condition_Input> = z.lazy(() =>
  z.union([ConditionLogic_Input, ConditionCheck_Input])
);
const TemplateTransition_Input = z.object({
  to: z.string().min(1),
  when: Condition_Input,
});
const TemplateConfigForFSMMode_Input = z.object({
  template: z.string().regex(/.*\.jinja/),
  transition: z.union([TemplateTransition_Input, z.null()]).optional(),
  initial: z.boolean().optional().default(false),
});
const JinjaEventPluginConfigForFSMMode_Input = z.object({
  params: z.object({}).partial().passthrough(),
  samples: z.record(SampleConfig),
  mode: z.string(),
  templates: z.array(z.record(TemplateConfigForFSMMode_Input)).min(1),
});
const JinjaEventPluginConfigForChainMode_Input = z.object({
  params: z.object({}).partial().passthrough(),
  samples: z.record(SampleConfig),
  mode: z.string(),
  chain: z.array(z.string()).min(1),
  templates: z.array(z.record(TemplateConfigForGeneralModes)).min(1),
});
const JinjaEventPluginConfig_Input = z.discriminatedUnion("mode", [
  JinjaEventPluginConfigForGeneralModes_Input,
  JinjaEventPluginConfigForChanceMode_Input,
  JinjaEventPluginConfigForFSMMode_Input,
  JinjaEventPluginConfigForChainMode_Input,
]);
const jinja_Input = z.object({ jinja: JinjaEventPluginConfig_Input });
const replay_Input = z.object({ replay: ReplayEventPluginConfig });
const EventPluginNamedConfig_Input = z.union([
  jinja_Input,
  replay_Input,
  script,
]);
const clickhouse_Input = z.object({ clickhouse: ClickhouseOutputPluginConfig });
const file_Input = z.object({ file: FileOutputPluginConfig });
const eventum__api__routers__generator_configs__runtime_types__http_Input__2 =
  z.object({ http: HttpOutputPluginConfig });
const opensearch_Input = z.object({ opensearch: OpensearchOutputPluginConfig });
const stdout_Input = z.object({ stdout: StdoutOutputPluginConfig });
const OutputPluginNamedConfig_Input = z.union([
  clickhouse_Input,
  file_Input,
  eventum__api__routers__generator_configs__runtime_types__http_Input__2,
  opensearch_Input,
  stdout_Input,
]);
const GeneratorConfig_Input = z.object({
  input: z.array(InputPluginNamedConfig_Input),
  event: EventPluginNamedConfig_Input,
  output: z.array(OutputPluginNamedConfig_Input),
});
const FileNode: z.ZodType<FileNode> = z.lazy(() =>
  z.object({
    name: z.string(),
    is_dir: z.boolean(),
    children: z.union([z.array(FileNode), z.null()]).optional(),
  })
);
const Body_upload_generator_file_generator_configs__name__file__filepath__post =
  z.object({ content: z.instanceof(File) }).passthrough();
const Body_put_generator_file_generator_configs__name__file__filepath__put = z
  .object({ content: z.instanceof(File) })
  .passthrough();
const span = z.union([z.string(), z.null()]).optional();
const AggregatedTimestamps = z.object({
  span_edges: z.array(z.string().datetime({ offset: true })),
  span_counts: z.record(z.array(z.number().int())),
});
const ProduceParams = z
  .object({
    timestamp: z.string().datetime({ offset: true }),
    tags: z.array(z.string()),
  })
  .passthrough();
const ProduceEventErrorInfo = z.object({
  index: z.number().int().gte(0),
  message: z.string(),
  context: z.object({}).partial().passthrough(),
});
const ProducedEventsInfo = z.object({
  events: z.array(z.string()),
  errors: z.array(ProduceEventErrorInfo),
  exhausted: z.boolean(),
});
const FormatEventsBody = z.object({
  formatter_config: z.union([
    SimpleFormatterConfig,
    JsonFormatterConfig,
    TemplateFormatterConfig,
  ]),
  events: z.array(z.string()).min(1),
});
const FormatErrorInfo = z.object({
  message: z.string(),
  original_event: z.union([z.string(), z.null()]),
});
const FormattingResult = z.object({
  events: z.array(z.string()),
  formatted_count: z.number().int(),
  errors: z.array(FormatErrorInfo),
});
const GeneratorParameters = z.object({
  timezone: z.string().min(3).optional().default("UTC"),
  batch: BatchParameters.optional(),
  queue: QueueParameters.optional(),
  keep_order: z.boolean().optional().default(false),
  max_concurrency: z.number().int().optional().default(100),
  write_timeout: z.number().int().gte(1).optional().default(10),
  id: z.string().min(1),
  path: z.string(),
  live_mode: z.boolean().optional().default(true),
  skip_past: z.boolean().optional().default(true),
  params: z.object({}).partial().passthrough().optional(),
});
const GeneratorStatus = z.object({
  is_initializing: z.boolean(),
  is_running: z.boolean(),
  is_ended_up: z.boolean(),
  is_ended_up_successfully: z.boolean(),
});
const InputPluginStats = z.object({
  plugin_name: z.string().min(1),
  plugin_id: z.number().int().gte(0),
  generated: z.number().int().gte(0),
});
const EventPluginStats = z.object({
  plugin_name: z.string().min(1),
  plugin_id: z.number().int().gte(0),
  produced: z.number().int().gte(0),
  produce_failed: z.number().int().gte(0),
});
const OutputPluginStats = z.object({
  plugin_name: z.string().min(1),
  plugin_id: z.number().int().gte(0),
  written: z.number().int().gte(0),
  write_failed: z.number().int().gte(0),
  format_failed: z.number().int().gte(0),
});
const GeneratorStats = z.object({
  start_time: z.string().datetime({ offset: true }),
  input: z.array(InputPluginStats),
  event: EventPluginStats,
  output: z.array(OutputPluginStats),
  total_generated: z.number().int(),
  total_written: z.number().int(),
  uptime: z.number(),
  input_eps: z.number(),
  output_eps: z.number(),
});
const BulkStartResponse = z.object({
  running_generator_ids: z.array(z.string()),
  non_running_generator_ids: z.array(z.string()),
});
const GeneratorsParameters = z.array(GeneratorParameters);

export const schemas = {
  InstanceInfo,
  SSLParameters_Output,
  AuthParameters,
  APIParameters_Output,
  BatchParameters,
  QueueParameters,
  GenerationParameters,
  LogParameters,
  PathParameters_Output,
  Settings_Output,
  SSLParameters_Input,
  APIParameters_Input,
  PathParameters_Input,
  Settings_Input,
  ValidationError,
  HTTPValidationError,
  VersatileDatetimeStrict,
  CronInputPluginConfig,
  cron_Output,
  HttpInputPluginConfig,
  eventum__api__routers__generator_configs__runtime_types__http__1,
  LinspaceInputPluginConfig,
  linspace_Output,
  StaticInputPluginConfig,
  static,
  TimePatternsInputPluginConfig,
  time_patterns,
  TimerInputPluginConfig,
  timer_Output,
  TimestampsInputPluginConfig,
  timestamps,
  InputPluginNamedConfig_Output,
  ItemsSampleConfig,
  CSVSampleConfig,
  JSONSampleConfig,
  SampleConfig,
  TemplateConfigForGeneralModes,
  JinjaEventPluginConfigForGeneralModes_Output,
  TemplateConfigForChanceMode,
  JinjaEventPluginConfigForChanceMode_Output,
  Or_Output,
  And_Output,
  Not_Output,
  ConditionLogic_Output,
  Eq,
  Gt,
  Ge,
  Lt,
  Le,
  Matches,
  LenEq,
  LenGt,
  LenGe,
  LenLt,
  LenLe,
  Contains,
  In,
  TimestampComponents,
  Before,
  After,
  eventum__plugins__event__plugins__jinja__fsm__fields__StateFieldName__2,
  Defined,
  HasTags,
  ConditionCheck_Output,
  Condition_Output,
  TemplateTransition_Output,
  TemplateConfigForFSMMode_Output,
  JinjaEventPluginConfigForFSMMode_Output,
  JinjaEventPluginConfigForChainMode_Output,
  JinjaEventPluginConfig_Output,
  jinja_Output,
  Encoding,
  ReplayEventPluginConfig,
  replay_Output,
  ScriptEventPluginConfig,
  script,
  EventPluginNamedConfig_Output,
  SimpleFormatterConfig,
  JsonFormatterConfig,
  TemplateFormatterConfig,
  ClickhouseInputFormat,
  ClickhouseOutputPluginConfig,
  clickhouse_Output,
  FileOutputPluginConfig,
  file_Output,
  HttpOutputPluginConfig,
  eventum__api__routers__generator_configs__runtime_types__http_Output__2,
  OpensearchOutputPluginConfig,
  opensearch_Output,
  StdoutOutputPluginConfig,
  stdout_Output,
  OutputPluginNamedConfig_Output,
  GeneratorConfig_Output,
  cron_Input,
  linspace_Input,
  timer_Input,
  InputPluginNamedConfig_Input,
  JinjaEventPluginConfigForGeneralModes_Input,
  JinjaEventPluginConfigForChanceMode_Input,
  Or_Input,
  And_Input,
  Not_Input,
  ConditionLogic_Input,
  ConditionCheck_Input,
  Condition_Input,
  TemplateTransition_Input,
  TemplateConfigForFSMMode_Input,
  JinjaEventPluginConfigForFSMMode_Input,
  JinjaEventPluginConfigForChainMode_Input,
  JinjaEventPluginConfig_Input,
  jinja_Input,
  replay_Input,
  EventPluginNamedConfig_Input,
  clickhouse_Input,
  file_Input,
  eventum__api__routers__generator_configs__runtime_types__http_Input__2,
  opensearch_Input,
  stdout_Input,
  OutputPluginNamedConfig_Input,
  GeneratorConfig_Input,
  FileNode,
  Body_upload_generator_file_generator_configs__name__file__filepath__post,
  Body_put_generator_file_generator_configs__name__file__filepath__put,
  span,
  AggregatedTimestamps,
  ProduceParams,
  ProduceEventErrorInfo,
  ProducedEventsInfo,
  FormatEventsBody,
  FormatErrorInfo,
  FormattingResult,
  GeneratorParameters,
  GeneratorStatus,
  InputPluginStats,
  EventPluginStats,
  OutputPluginStats,
  GeneratorStats,
  BulkStartResponse,
  GeneratorsParameters,
};

const endpoints = makeApi([
  {
    method: "get",
    path: "/generator-configs/",
    alias: "list_generator_dirs_generator_configs__get",
    description: `List all generator directory names inside &#x60;path.generators_dir&#x60; with generator configs.`,
    requestFormat: "json",
    response: z.array(z.string()),
  },
  {
    method: "get",
    path: "/generator-configs/:name",
    alias: "get_generator_config_generator_configs__name__get",
    description: `Get generator configuration in the directory with specified name.`,
    requestFormat: "json",
    parameters: [
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: GeneratorConfig_Output,
    errors: [
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Configuration cannot be processed due to parsing or validation errors`,
        schema: z.void(),
      },
      {
        status: 500,
        description: `Configuration cannot be read due to OS error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "post",
    path: "/generator-configs/:name",
    alias: "create_generator_config_generator_configs__name__post",
    description: `Create generator configuration in the directory with specified name.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: GeneratorConfig_Input,
      },
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 409,
        description: `Configuration already exists`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `Configuration cannot be created due to OS error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "put",
    path: "/generator-configs/:name",
    alias: "update_generator_config_generator_configs__name__put",
    description: `Update generator configuration in the directory with specified name.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: GeneratorConfig_Input,
      },
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `Configuration cannot be updated due to OS error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "delete",
    path: "/generator-configs/:name",
    alias: "delete_generator_config_generator_configs__name__delete",
    description: `Delete whole generator configuration directory with specified name.`,
    requestFormat: "json",
    parameters: [
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `Configuration cannot be deleted due to OS error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "post",
    path: "/generator-configs/:name/file-copy/",
    alias: "copy_generator_file_generator_configs__name__file_copy__post",
    description: `Copy file from source to destination location inside generator directory with specified name.`,
    requestFormat: "json",
    parameters: [
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "source",
        type: "Query",
        schema: z.string(),
      },
      {
        name: "destination",
        type: "Query",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 400,
        description: `Parent directories traversal (i.e. using &#x27;..&#x27;) is not allowed and path cannot be absolute`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist

Source file does not exist;`,
        schema: z.void(),
      },
      {
        status: 409,
        description: `Destination file already exists`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `File cannot be copied due to OS error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "post",
    path: "/generator-configs/:name/file-move/",
    alias: "move_generator_file_generator_configs__name__file_move__post",
    description: `Move file from source to destination location inside generator directory with specified name.`,
    requestFormat: "json",
    parameters: [
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "source",
        type: "Query",
        schema: z.string(),
      },
      {
        name: "destination",
        type: "Query",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 400,
        description: `Parent directories traversal (i.e. using &#x27;..&#x27;) is not allowed and path cannot be absolute`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist

Source file does not exist;`,
        schema: z.void(),
      },
      {
        status: 409,
        description: `Destination file already exists`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `File cannot be moved due to OS error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "get",
    path: "/generator-configs/:name/file-tree",
    alias: "get_generator_file_tree_generator_configs__name__file_tree_get",
    description: `Get file tree of the generator directory with specified name.`,
    requestFormat: "json",
    parameters: [
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.array(FileNode),
    errors: [
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `File tree cannot be built due to OS error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "get",
    path: "/generator-configs/:name/file/:filepath",
    alias: "get_generator_file_generator_configs__name__file__filepath__get",
    description: `Read file from specified path inside generator directory with specified name.`,
    requestFormat: "json",
    parameters: [
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "filepath",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 400,
        description: `Parent directories traversal (i.e. using &#x27;..&#x27;) is not allowed and path cannot be absolute`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist

File does not exist;`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `File cannot be read due to OS error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "post",
    path: "/generator-configs/:name/file/:filepath",
    alias:
      "upload_generator_file_generator_configs__name__file__filepath__post",
    description: `Upload file to specified path inside generator directory with specified name.`,
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ content: z.instanceof(File) }).passthrough(),
      },
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "filepath",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 400,
        description: `Parent directories traversal (i.e. using &#x27;..&#x27;) is not allowed and path cannot be absolute`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist`,
        schema: z.void(),
      },
      {
        status: 409,
        description: `File already exists`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `File cannot be uploaded due to OS error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "put",
    path: "/generator-configs/:name/file/:filepath",
    alias: "put_generator_file_generator_configs__name__file__filepath__put",
    description: `Put file to specified path inside generator directory with specified name.`,
    requestFormat: "form-data",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({ content: z.instanceof(File) }).passthrough(),
      },
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "filepath",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 400,
        description: `Parent directories traversal (i.e. using &#x27;..&#x27;) is not allowed and path cannot be absolute`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist

File does not exist;`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `File cannot be uploaded due to OS error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "delete",
    path: "/generator-configs/:name/file/:filepath",
    alias:
      "delete_generator_file_generator_configs__name__file__filepath__delete",
    description: `Delete file in specified path inside generator directory with specified name.`,
    requestFormat: "json",
    parameters: [
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "filepath",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 400,
        description: `Parent directories traversal (i.e. using &#x27;..&#x27;) is not allowed and path cannot be absolute`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist

File does not exist;`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `File cannot be deleted due to OS error`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "get",
    path: "/generator-configs/:name/path",
    alias: "get_generator_config_path_generator_configs__name__path_get",
    description: `Get generator configuration path in the directory with specified name.`,
    requestFormat: "json",
    parameters: [
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.string(),
    errors: [
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/generators/",
    alias: "list_generators_generators__get",
    description: `List ids of all generators`,
    requestFormat: "json",
    response: z.array(z.string()),
  },
  {
    method: "get",
    path: "/generators/:id/",
    alias: "get_generator_generators__id___get",
    description: `Get generator parameters`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string().min(1),
      },
    ],
    response: GeneratorParameters,
    errors: [
      {
        status: 404,
        description: `Generator with provided id is not found`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/generators/:id/",
    alias: "add_generator_generators__id___post",
    description: `Add generator. Note that &#x60;id&#x60; path parameter takes precedence over &#x60;id&#x60; field in the body.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: GeneratorParameters,
      },
      {
        name: "id",
        type: "Path",
        schema: z.string().min(1),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 409,
        description: `Generator with provided id already exists`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `No configuration exists in specified path

No configuration exists in specified path;`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "put",
    path: "/generators/:id/",
    alias: "update_generator_generators__id___put",
    description: `Update generator with provided parameters. Note that &#x60;id&#x60; path parameter takes precedence over &#x60;id&#x60; field in the body.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: GeneratorParameters,
      },
      {
        name: "id",
        type: "Path",
        schema: z.string().min(1),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Generator with provided id is not found`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `No configuration exists in specified path

No configuration exists in specified path;`,
        schema: z.void(),
      },
      {
        status: 423,
        description: `Generator must be stopped before updating`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "delete",
    path: "/generators/:id/",
    alias: "delete_generator_generators__id___delete",
    description: `Remove generator by its id. Stop it in case it is running.`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string().min(1),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Generator with provided id is not found`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/generators/:id/start/",
    alias: "start_generator_generators__id__start__post",
    description: `Start generator by its id`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string().min(1),
      },
    ],
    response: z.boolean(),
    errors: [
      {
        status: 404,
        description: `Generator with provided id is not found`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/generators/:id/stats/",
    alias: "get_generator_stats_generators__id__stats__get",
    description: `Get stats of running generator`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string().min(1),
      },
    ],
    response: GeneratorStats,
    errors: [
      {
        status: 404,
        description: `Generator with provided id is not found`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/generators/:id/status/",
    alias: "get_generator_status_generators__id__status__get",
    description: `Get generator status`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string().min(1),
      },
    ],
    response: GeneratorStatus,
    errors: [
      {
        status: 404,
        description: `Generator with provided id is not found`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/generators/:id/stop/",
    alias: "stop_generator_generators__id__stop__post",
    description: `Stop generator by its id`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string().min(1),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Generator with provided id is not found`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/generators/group-actions/bulk-remove/",
    alias: "bulk_remove_generators_generators_group_actions_bulk_remove__post",
    description: `Bulk remove several generators`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.array(z.string()).min(1),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/generators/group-actions/bulk-start/",
    alias: "bulk_start_generators_generators_group_actions_bulk_start__post",
    description: `Bulk start several generators`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.array(z.string()).min(1),
      },
    ],
    response: BulkStartResponse,
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/generators/group-actions/bulk-stop/",
    alias: "bulk_stop_generators_generators_group_actions_bulk_stop__post",
    description: `Bulk stop several generators`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.array(z.string()).min(1),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/instance/info",
    alias: "get_info_instance_info_get",
    description: `Information about app and host`,
    requestFormat: "json",
    response: InstanceInfo,
  },
  {
    method: "post",
    path: "/instance/restart",
    alias: "restart_instance_restart_post",
    description: `Restart instance`,
    requestFormat: "json",
    response: z.unknown(),
    errors: [
      {
        status: 500,
        description: `Error occurred during restart`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "get",
    path: "/instance/settings",
    alias: "get_settings_instance_settings_get",
    description: `Get settings`,
    requestFormat: "json",
    response: Settings_Output,
  },
  {
    method: "put",
    path: "/instance/settings",
    alias: "update_settings_instance_settings_put",
    description: `Update settings. Note that this only updates file. For changes to take effect u have to restart instance.`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: Settings_Input,
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `Error occurred during settings file path resolution`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "post",
    path: "/instance/stop",
    alias: "stop_instance_stop_post",
    description: `Stop instance`,
    requestFormat: "json",
    response: z.unknown(),
    errors: [
      {
        status: 500,
        description: `Error occurred during termination`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "post",
    path: "/preview/:name/event-plugin",
    alias: "initialize_event_plugin_preview__name__event_plugin_post",
    description: `Initialize event plugin`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: EventPluginNamedConfig_Input,
      },
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `Event plugin cannot be initialized`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "delete",
    path: "/preview/:name/event-plugin",
    alias: "release_event_plugin_preview__name__event_plugin_delete",
    description: `Release event plugin with freeing acquired resource`,
    requestFormat: "json",
    parameters: [
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 400,
        description: `Event plugin was not previously initialized`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/preview/:name/event-plugin/jinja/state/global",
    alias:
      "get_jinja_event_plugin_global_state_preview__name__event_plugin_jinja_state_global_get",
    description: `Get global state of jinja event plugin`,
    requestFormat: "json",
    parameters: [
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.object({}).partial().passthrough(),
    errors: [
      {
        status: 400,
        description: `Event plugin was not previously initialized

Currently used plugin is inappropriate for this operation;`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `Failed to serialize plugin state`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "patch",
    path: "/preview/:name/event-plugin/jinja/state/global",
    alias:
      "update_jinja_event_plugin_global_state_preview__name__event_plugin_jinja_state_global_patch",
    description: `Patch global state of jinja event plugin`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().passthrough(),
      },
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 400,
        description: `Event plugin was not previously initialized

Currently used plugin is inappropriate for this operation;`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "delete",
    path: "/preview/:name/event-plugin/jinja/state/global",
    alias:
      "clear_jinja_event_plugin_global_state_preview__name__event_plugin_jinja_state_global_delete",
    description: `Clear global state of jinja event plugin`,
    requestFormat: "json",
    parameters: [
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 400,
        description: `Event plugin was not previously initialized

Currently used plugin is inappropriate for this operation;`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/preview/:name/event-plugin/jinja/state/local/:alias",
    alias:
      "get_jinja_event_plugin_local_state_preview__name__event_plugin_jinja_state_local__alias__get",
    description: `Get local state of jinja event plugin for the specified template by its alias`,
    requestFormat: "json",
    parameters: [
      {
        name: "alias",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.object({}).partial().passthrough(),
    errors: [
      {
        status: 400,
        description: `Event plugin was not previously initialized

Currently used plugin is inappropriate for this operation;`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist

State with provided template alias is not found;`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `Failed to serialize plugin state`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "patch",
    path: "/preview/:name/event-plugin/jinja/state/local/:alias",
    alias:
      "update_jinja_event_plugin_local_state_preview__name__event_plugin_jinja_state_local__alias__patch",
    description: `Patch local state of jinja event plugin for the specified template by its alias`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().passthrough(),
      },
      {
        name: "alias",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 400,
        description: `Event plugin was not previously initialized

Currently used plugin is inappropriate for this operation;`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist

State with provided template alias is not found;`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "delete",
    path: "/preview/:name/event-plugin/jinja/state/local/:alias",
    alias:
      "clear_jinja_event_plugin_local_state_preview__name__event_plugin_jinja_state_local__alias__delete",
    description: `Clear local state of jinja event plugin for the specified template by its alias`,
    requestFormat: "json",
    parameters: [
      {
        name: "alias",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 400,
        description: `Event plugin was not previously initialized

Currently used plugin is inappropriate for this operation;`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist

State with provided template alias is not found;`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "get",
    path: "/preview/:name/event-plugin/jinja/state/shared",
    alias:
      "get_jinja_event_plugin_shared_state_preview__name__event_plugin_jinja_state_shared_get",
    description: `Get shared state of jinja event plugin`,
    requestFormat: "json",
    parameters: [
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.object({}).partial().passthrough(),
    errors: [
      {
        status: 400,
        description: `Event plugin was not previously initialized

Currently used plugin is inappropriate for this operation;`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `Failed to serialize plugin state`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "patch",
    path: "/preview/:name/event-plugin/jinja/state/shared",
    alias:
      "update_jinja_event_plugin_shared_state_preview__name__event_plugin_jinja_state_shared_patch",
    description: `Patch shared state of jinja event plugin`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.object({}).partial().passthrough(),
      },
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 400,
        description: `Event plugin was not previously initialized

Currently used plugin is inappropriate for this operation;`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "delete",
    path: "/preview/:name/event-plugin/jinja/state/shared",
    alias:
      "clear_jinja_event_plugin_shared_state_preview__name__event_plugin_jinja_state_shared_delete",
    description: `Clear shared state of jinja event plugin`,
    requestFormat: "json",
    parameters: [
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 400,
        description: `Event plugin was not previously initialized

Currently used plugin is inappropriate for this operation;`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/preview/:name/event-plugin/produce",
    alias: "produce_events_preview__name__event_plugin_produce_post",
    description: `Produce events using initialized event plugin`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.array(ProduceParams),
      },
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: ProducedEventsInfo,
    errors: [
      {
        status: 400,
        description: `Event plugin was not previously initialized`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/preview/:name/formatter/format",
    alias: "format_events_preview__name__formatter_format_post",
    description: `Format events using specified formatter`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: FormatEventsBody,
      },
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
    ],
    response: FormattingResult,
    errors: [
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
    ],
  },
  {
    method: "post",
    path: "/preview/:name/input-plugins/generate",
    alias: "generate_timestamps_preview__name__input_plugins_generate_post",
    description: `Generate timestamps using input plugins`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.array(InputPluginNamedConfig_Input),
      },
      {
        name: "name",
        type: "Path",
        schema: z.string(),
      },
      {
        name: "size",
        type: "Query",
        schema: z.number().int().gte(1).optional().default(1000),
      },
      {
        name: "skip_past",
        type: "Query",
        schema: z.boolean().optional().default(true),
      },
      {
        name: "timezone",
        type: "Query",
        schema: z.string().optional().default("UTC"),
      },
      {
        name: "span",
        type: "Query",
        schema: span,
      },
    ],
    response: AggregatedTimestamps,
    errors: [
      {
        status: 400,
        description: `Timezone is invalid

Span expression is invalid;`,
        schema: z.void(),
      },
      {
        status: 403,
        description: `Accessing directories outside &#x60;path.generators_dir&#x60; is not allowed`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator configuration does not exist`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `Some of the input plugins cannot be initialized

Failed to generate timestamps;`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "get",
    path: "/secrets/:name",
    alias: "get_secret_value_secrets__name__get",
    description: `Get secret with specified name from keyring`,
    requestFormat: "json",
    parameters: [
      {
        name: "name",
        type: "Path",
        schema: z.string().min(1),
      },
    ],
    response: z.string(),
    errors: [
      {
        status: 404,
        description: `Secret is missing in keyring`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `Failed to obtain secret`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "put",
    path: "/secrets/:name",
    alias: "set_secret_value_secrets__name__put",
    description: `Put secret with specified name to keyring`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: z.string().min(1),
      },
      {
        name: "name",
        type: "Path",
        schema: z.string().min(1),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `Failed to set secret`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "delete",
    path: "/secrets/:name",
    alias: "delete_secret_value_secrets__name__delete",
    description: `Delete secret with specified name to keyring`,
    requestFormat: "json",
    parameters: [
      {
        name: "name",
        type: "Path",
        schema: z.string().min(1),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `Failed to remove secret`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "get",
    path: "/startup/",
    alias: "get_generators_in_startup_startup__get",
    description: `Get list of generator definitions in the startup file`,
    requestFormat: "json",
    response: z.array(GeneratorParameters).min(1),
    errors: [
      {
        status: 500,
        description: `Cannot read startup file due to OS error

Startup file structure is invalid;`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "get",
    path: "/startup/:id",
    alias: "get_generator_from_startup_startup__id__get",
    description: `Get generator definition from list in the startup file`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string().min(1),
      },
    ],
    response: GeneratorParameters,
    errors: [
      {
        status: 404,
        description: `Generator with this ID is not defined`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `Cannot read startup file due to OS error

Startup file structure is invalid;`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "post",
    path: "/startup/:id",
    alias: "add_generator_to_startup_startup__id__post",
    description: `Add generator definition to list in the startup file`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: GeneratorParameters,
      },
      {
        name: "id",
        type: "Path",
        schema: z.string().min(1),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 400,
        description: `ID field in the body does not match ID path parameter`,
        schema: z.void(),
      },
      {
        status: 409,
        description: `Generator with this ID is already defined`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `Cannot read startup file due to OS error

Startup file structure is invalid;

Cannot append updated content to startup file due to OS error;`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "put",
    path: "/startup/:id",
    alias: "update_generator_in_startup_startup__id__put",
    description: `Update generator definition in list in the startup file`,
    requestFormat: "json",
    parameters: [
      {
        name: "body",
        type: "Body",
        schema: GeneratorParameters,
      },
      {
        name: "id",
        type: "Path",
        schema: z.string().min(1),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 400,
        description: `ID field in the body does not match ID path parameter`,
        schema: z.void(),
      },
      {
        status: 404,
        description: `Generator with this ID is not defined`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `Cannot read startup file due to OS error

Startup file structure is invalid;

Cannot modify startup file due to OS error;`,
        schema: z.void(),
      },
    ],
  },
  {
    method: "delete",
    path: "/startup/:id",
    alias: "delete_generator_from_startup_startup__id__delete",
    description: `Delete generator definition from list in the startup file`,
    requestFormat: "json",
    parameters: [
      {
        name: "id",
        type: "Path",
        schema: z.string().min(1),
      },
    ],
    response: z.unknown(),
    errors: [
      {
        status: 404,
        description: `Generator with this ID is not defined`,
        schema: z.void(),
      },
      {
        status: 422,
        description: `Validation Error`,
        schema: HTTPValidationError,
      },
      {
        status: 500,
        description: `Cannot read startup file due to OS error

Startup file structure is invalid;

Cannot modify startup file due to OS error;`,
        schema: z.void(),
      },
    ],
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
