import {
  ActionIcon,
  Badge,
  Button,
  Code,
  Group,
  Select,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import {
  IconArrowsLeftRight,
  IconFileText,
  IconPlus,
  IconRefresh,
  IconX,
} from '@tabler/icons-react';
import isEqual from 'lodash/isEqual';
import { nanoid } from 'nanoid';
import { FC, useEffect, useRef, useState } from 'react';

import { useProjectName } from '../../hooks/useProjectName';
import {
  ToolBody,
  ToolEmpty,
  ToolPane,
  ToolShell,
  ToolSpacer,
} from '../../studio/panels/console/primitives';
import { FormatterParams } from '../OutputPluginParams/components/FormatterParams';
import { useFormatEventsMutation } from '@/api/hooks/usePreview';
import { OUTPUT_PLUGIN_DEFAULT_FORMATTERS } from '@/api/routes/generator-configs/modules/plugins/registry';
import { OutputPluginsNamedConfig } from '@/api/routes/generator-configs/schemas';
import { OutputPluginConfig } from '@/api/routes/generator-configs/schemas/plugins/output';
import { OutputPluginName } from '@/api/routes/generator-configs/schemas/plugins/output/base-config';
import {
  Format,
  FormatterConfig,
} from '@/api/routes/generator-configs/schemas/plugins/output/formatters';
import { FormattingResult } from '@/api/routes/preview/schemas';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';
import { CONFIRM } from '@/theme/copy';

interface FormatterTabProps {
  outputPlugins: OutputPluginsNamedConfig;
  outputPluginNames: string[];
  outputPluginIds: string[];
  selectedOutputPluginId: string | undefined;
  debuggerEvents?: string[];
  onSetOutputPluginFormatter: (id: string, formatter: FormatterConfig) => void;
}

function getFormatterConfig(
  outputPlugin: OutputPluginsNamedConfig[number]
): FormatterConfig {
  const [name, config] = Object.entries(outputPlugin)[0] as [
    OutputPluginName,
    OutputPluginConfig,
  ];
  return config.formatter ?? OUTPUT_PLUGIN_DEFAULT_FORMATTERS[name];
}

function cloneFormatter(
  formatter: FormatterConfig | undefined
): FormatterConfig | undefined {
  return formatter === undefined ? undefined : structuredClone(formatter);
}

export const FormatterTab: FC<FormatterTabProps> = ({
  outputPlugins,
  outputPluginNames,
  outputPluginIds,
  selectedOutputPluginId,
  debuggerEvents,
  onSetOutputPluginFormatter,
}) => {
  const initialFormatterSource =
    selectedOutputPluginId ?? outputPluginIds[0] ?? '';
  const initialOutputPlugin =
    outputPlugins[outputPluginIds.indexOf(initialFormatterSource)];
  const initialFormatter = initialOutputPlugin
    ? cloneFormatter(getFormatterConfig(initialOutputPlugin))
    : { format: Format.Plain };
  const form = useForm<{ formatter?: FormatterConfig }>({
    initialValues: {
      formatter: initialFormatter,
    },
  });

  const { projectName } = useProjectName();
  const formatEvents = useFormatEventsMutation();

  const [events, setEvents] = useState<{ id: string; content: string }[]>([
    { id: nanoid(), content: '' },
  ]);
  const [formatterSource, setFormatterSource] = useState(
    initialFormatterSource
  );
  const [formatterBaseline, setFormatterBaseline] = useState<
    FormatterConfig | undefined
  >(cloneFormatter(initialFormatter));
  const formatterSourceRef = useRef(formatterSource);
  formatterSourceRef.current = formatterSource;
  const loadFormatterSourceRef = useRef<((sourceId: string) => void) | null>(
    null
  );
  const requestFormatterSourceRef = useRef<((sourceId: string) => void) | null>(
    null
  );
  const syncFormatterSourceRef = useRef<(() => void) | null>(null);
  const [formattingResult, setFormattingResult] =
    useState<FormattingResult | null>(null);

  const formatterSourceOptions = outputPluginNames.map((name, index) => ({
    value: outputPluginIds[index]!,
    label: `${name} #${index + 1}`,
  }));
  const formatterSourceIndex = outputPluginIds.indexOf(formatterSource);
  const formatterSourceLabel =
    formatterSourceOptions.find(({ value }) => value === formatterSource)
      ?.label ?? 'output plugin';
  const sourceOutputPlugin = outputPlugins[formatterSourceIndex];
  const formatterMatchesSource =
    sourceOutputPlugin !== undefined &&
    isEqual(form.values.formatter, getFormatterConfig(sourceOutputPlugin));
  const formatterModified = !isEqual(form.values.formatter, formatterBaseline);

  useEffect(() => {
    if (selectedOutputPluginId !== undefined) {
      requestFormatterSourceRef.current?.(selectedOutputPluginId);
    }
  }, [selectedOutputPluginId]);

  useEffect(() => {
    if (outputPluginIds.includes(formatterSourceRef.current)) {
      return;
    }

    const nextSource = selectedOutputPluginId ?? outputPluginIds[0];
    if (nextSource !== undefined) {
      loadFormatterSourceRef.current?.(nextSource);
    }
  }, [outputPluginIds, selectedOutputPluginId]);

  useEffect(() => {
    syncFormatterSourceRef.current?.();
  }, [sourceOutputPlugin]);

  function loadFormatterSource(sourceId: string) {
    const index = outputPluginIds.indexOf(sourceId);
    const outputPlugin = outputPlugins[index];
    if (outputPlugin === undefined) {
      return;
    }

    const formatter = structuredClone(getFormatterConfig(outputPlugin));
    formatterSourceRef.current = sourceId;
    form.setFieldValue('formatter', formatter);
    setFormatterBaseline(structuredClone(formatter));
    setFormatterSource(sourceId);
  }

  loadFormatterSourceRef.current = loadFormatterSource;

  function requestFormatterSource(sourceId: string) {
    if (sourceId === formatterSource) {
      return;
    }

    if (!outputPluginIds.includes(formatterSource) || !formatterModified) {
      loadFormatterSource(sourceId);
      return;
    }

    const label =
      formatterSourceOptions.find(({ value }) => value === sourceId)?.label ??
      'selected output';
    modals.openConfirmModal({
      title: CONFIRM.loadAnotherFormatter.title,
      children: (
        <Text size="sm">{CONFIRM.loadAnotherFormatter.body(label)}</Text>
      ),
      labels: {
        cancel: CONFIRM.loadAnotherFormatter.cancel,
        confirm: CONFIRM.loadAnotherFormatter.confirm,
      },
      onConfirm: () => {
        loadFormatterSourceRef.current?.(sourceId);
        modals.closeAll();
      },
    });
  }

  requestFormatterSourceRef.current = requestFormatterSource;

  function syncFormatterSource() {
    if (
      sourceOutputPlugin === undefined ||
      formatterSourceRef.current !== formatterSource
    ) {
      return;
    }

    const formatter = structuredClone(getFormatterConfig(sourceOutputPlugin));
    if (!formatterModified && !isEqual(form.values.formatter, formatter)) {
      form.setFieldValue('formatter', formatter);
    }
    if (!isEqual(formatterBaseline, formatter)) {
      setFormatterBaseline(structuredClone(formatter));
    }
  }

  syncFormatterSourceRef.current = syncFormatterSource;

  function handleResetFormatter() {
    if (sourceOutputPlugin === undefined) {
      return;
    }

    const formatter = structuredClone(getFormatterConfig(sourceOutputPlugin));
    form.setFieldValue('formatter', formatter);
    setFormatterBaseline(structuredClone(formatter));
  }

  function handleApplyFormatter() {
    const formatter = form.values.formatter;
    if (formatter === undefined || sourceOutputPlugin === undefined) {
      return;
    }

    modals.openConfirmModal({
      title: CONFIRM.applyFormatter.title,
      children: (
        <Text size="sm">
          {CONFIRM.applyFormatter.body(formatterSourceLabel)}
        </Text>
      ),
      labels: {
        cancel: CONFIRM.applyFormatter.cancel,
        confirm: CONFIRM.applyFormatter.confirm,
      },
      onConfirm: () => {
        onSetOutputPluginFormatter(formatterSource, structuredClone(formatter));
        setFormatterBaseline(structuredClone(formatter));
        modals.closeAll();
      },
    });
  }

  function handleLoadDebuggerEvents() {
    if (debuggerEvents === undefined) {
      return;
    }

    setEvents(
      debuggerEvents.map((content) => ({
        id: nanoid(),
        content,
      }))
    );
  }

  function handleFormatEvents(values: typeof form.values) {
    if (values.formatter === undefined) {
      return;
    }

    formatEvents.mutate(
      {
        name: projectName,
        body: {
          events: events.map((event) => event.content),
          formatter_config: values.formatter,
        },
      },
      {
        onSuccess: (data) => {
          setFormattingResult(data);
        },
        onError: (error) => {
          notifications.show({
            title: 'Error',
            message: (
              <>
                Failed to format events
                <ShowErrorDetailsAnchor error={error} prependDot />
              </>
            ),
            color: 'red',
          });
        },
      }
    );
  }

  const canFormat = events.length > 0 && form.values.formatter !== undefined;

  return (
    <ToolShell
      toolbar={
        <>
          <Text size="xs" c="dimmed" maw={520}>
            Feed sample events through the configured formatter to preview the
            delivered payload.
          </Text>
          <ToolSpacer />
          <form onSubmit={form.onSubmit(handleFormatEvents)}>
            <Button
              leftSection={<IconArrowsLeftRight size={15} />}
              type="submit"
              disabled={!canFormat}
              loading={formatEvents.isPending}
            >
              Format
            </Button>
          </form>
        </>
      }
    >
      <ToolBody>
        <ToolPane
          title={
            <Group gap={6} wrap="nowrap">
              <span>Formatter</span>
              <Badge
                size="xs"
                variant="light"
                color={formatterMatchesSource ? 'green' : 'yellow'}
              >
                {formatterMatchesSource ? 'Loaded' : 'Custom'}
              </Badge>
            </Group>
          }
          grow={0}
          basis={380}
          actions={
            <Group gap={4} wrap="nowrap">
              <Select
                aria-label="Output plugin formatter source"
                data={formatterSourceOptions}
                value={formatterSource}
                onChange={(value) => {
                  if (value !== null) {
                    requestFormatterSource(value);
                  }
                }}
                allowDeselect={false}
                size="xs"
                w={115}
              />
              {formatterModified && (
                <>
                  <Tooltip label="Reset formatter changes" withArrow>
                    <ActionIcon
                      variant="default"
                      size={30}
                      aria-label="Reset formatter changes"
                      onClick={handleResetFormatter}
                    >
                      <IconRefresh size={15} />
                    </ActionIcon>
                  </Tooltip>
                  <Button
                    aria-label={`Apply formatter to ${formatterSourceLabel}`}
                    variant="default"
                    size="xs"
                    disabled={
                      form.values.formatter === undefined ||
                      sourceOutputPlugin === undefined
                    }
                    onClick={handleApplyFormatter}
                  >
                    Apply
                  </Button>
                </>
              )}
            </Group>
          }
        >
          <FormatterParams
            value={form.values.formatter}
            errors={form.errors}
            onChange={(config) => {
              form.setFieldValue('formatter', config);
            }}
          />
        </ToolPane>

        <ToolPane
          title="Events"
          grow={1}
          actions={
            <Group gap={4} wrap="nowrap">
              <Button
                variant="default"
                size="xs"
                aria-label={
                  debuggerEvents === undefined
                    ? 'No debugger events to load'
                    : `Replace with ${debuggerEvents.length} debugger events`
                }
                disabled={debuggerEvents === undefined}
                onClick={handleLoadDebuggerEvents}
              >
                {debuggerEvents === undefined
                  ? 'No debugger events'
                  : `Replace with ${debuggerEvents.length} debugger events`}
              </Button>
              <Tooltip label="Add event" withArrow>
                <ActionIcon
                  variant="default"
                  size={30}
                  aria-label="Add event"
                  onClick={() =>
                    setEvents((prev) => [
                      ...prev,
                      { id: nanoid(), content: '' },
                    ])
                  }
                >
                  <IconPlus size={15} />
                </ActionIcon>
              </Tooltip>
            </Group>
          }
        >
          {events.length > 0 ? (
            <div className="tool-list">
              {events.map((event, index) => (
                <Textarea
                  key={event.id}
                  value={event.content}
                  placeholder="raw event ..."
                  minRows={2}
                  autosize
                  rightSection={
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      title="Delete event"
                      onClick={() => {
                        setEvents((prev) =>
                          prev.filter((e) => e.id !== event.id)
                        );
                      }}
                    >
                      <IconX size={15} />
                    </ActionIcon>
                  }
                  rightSectionProps={{
                    style: {
                      alignSelf: 'flex-start',
                      marginTop: 6,
                    },
                  }}
                  onChange={(e) => {
                    const next = [...events];
                    next[index] = { ...event, content: e.currentTarget.value };
                    setEvents(next);
                  }}
                />
              ))}
            </div>
          ) : (
            <ToolEmpty>Add an event to format.</ToolEmpty>
          )}
        </ToolPane>

        <ToolPane title="Result" grow={1}>
          {formattingResult === null ? (
            <ToolEmpty icon={<IconFileText size={28} />}>
              Format the events to preview the delivered output.
            </ToolEmpty>
          ) : (
            <>
              <Text size="xs" fw={600} c="dimmed" mb={6}>
                Formatted events
              </Text>
              {formattingResult.events.length > 0 ? (
                <div className="tool-list">
                  {formattingResult.events.map((event, index) => (
                    <Code key={index} block>
                      {event}
                    </Code>
                  ))}
                </div>
              ) : (
                <Text size="sm" c="dimmed">
                  No events
                </Text>
              )}

              <Group gap={6} mt="sm" mb={6}>
                <Text size="xs" fw={600} c="dimmed">
                  Errors
                </Text>
                {formattingResult.errors.length > 0 && (
                  <Text size="xs" c="red">
                    {formattingResult.errors.length}
                  </Text>
                )}
              </Group>
              {formattingResult.errors.length > 0 ? (
                <div className="tool-list">
                  {formattingResult.errors.map((error, index) => (
                    <Code key={index} block>
                      {error.message}
                      {error.original_event !== null &&
                        `\nOriginal event:\n${error.original_event}`}
                    </Code>
                  ))}
                </div>
              ) : (
                <Text size="sm" c="dimmed">
                  No errors
                </Text>
              )}
            </>
          )}
        </ToolPane>
      </ToolBody>
    </ToolShell>
  );
};
