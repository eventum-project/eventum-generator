import {
  ActionIcon,
  Button,
  Code,
  Group,
  Select,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconArrowsLeftRight,
  IconFileText,
  IconPlus,
  IconX,
} from '@tabler/icons-react';
import { nanoid } from 'nanoid';
import { FC, useEffect, useState } from 'react';

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

interface FormatterTabProps {
  outputPlugins: OutputPluginsNamedConfig;
  outputPluginNames: string[];
  outputPluginIds: string[];
  selectedOutputPluginId: string | undefined;
  debuggerEvents?: string[];
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

export const FormatterTab: FC<FormatterTabProps> = ({
  outputPlugins,
  outputPluginNames,
  outputPluginIds,
  selectedOutputPluginId,
  debuggerEvents,
}) => {
  const form = useForm<{ formatter?: FormatterConfig }>({
    initialValues: {
      formatter: {
        format: Format.Plain,
      },
    },
  });

  const { projectName } = useProjectName();
  const formatEvents = useFormatEventsMutation();

  const [events, setEvents] = useState<{ id: string; content: string }[]>([
    { id: nanoid(), content: '' },
  ]);
  const [formatterSource, setFormatterSource] = useState(
    selectedOutputPluginId ?? outputPluginIds[0] ?? ''
  );
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

  useEffect(() => {
    if (selectedOutputPluginId !== undefined) {
      setFormatterSource(selectedOutputPluginId);
    }
  }, [selectedOutputPluginId]);

  useEffect(() => {
    setFormatterSource((current) =>
      outputPluginIds.includes(current)
        ? current
        : (selectedOutputPluginId ?? outputPluginIds[0] ?? '')
    );
  }, [outputPluginIds, selectedOutputPluginId]);

  function handleLoadFormatter() {
    const outputPlugin = outputPlugins[formatterSourceIndex];
    if (outputPlugin === undefined) {
      return;
    }

    form.setFieldValue(
      'formatter',
      structuredClone(getFormatterConfig(outputPlugin))
    );
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
          title="Formatter"
          grow={0}
          basis={300}
          actions={
            <Group gap={4} wrap="nowrap">
              <Select
                aria-label="Output plugin formatter source"
                data={formatterSourceOptions}
                value={formatterSource}
                onChange={(value) => {
                  if (value !== null) {
                    setFormatterSource(value);
                  }
                }}
                allowDeselect={false}
                size="xs"
                w={115}
              />
              <Button
                aria-label={`Load formatter from ${formatterSourceLabel}`}
                variant="default"
                size="compact-xs"
                disabled={outputPlugins[formatterSourceIndex] === undefined}
                onClick={handleLoadFormatter}
              >
                Load
              </Button>
            </Group>
          }
        >
          <FormatterParams
            value={form.values.formatter}
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
                size="compact-xs"
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
                  size="sm"
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
