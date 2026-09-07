import {
  ActionIcon,
  Button,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import type { FormErrors } from '@mantine/form';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { nanoid } from 'nanoid';
import { FC, useEffect, useMemo, useState } from 'react';

import { EventValueInput } from './EventValueInput';
import {
  EventFieldRef,
  SYSLOG_FACILITIES,
  SYSLOG_MESSAGE_FORMATS,
  SYSLOG_SEVERITIES,
  SyslogFormatterConfig,
  SyslogStructuredData,
} from '@/api/routes/generator-configs/schemas/plugins/output/formatters';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';

const RFC_5424 = 5424;
const RFC_3164 = 3164;

/**
 * Name of a facility or a severity written as its own code, since the
 * lists hold the names in the order of the codes.
 */
const nameOfCode = (
  value: string | number | EventFieldRef | undefined,
  names: readonly string[]
) => (typeof value === 'number' ? (names[value] ?? value) : value);

interface SyslogFormatterParamsProps {
  value: SyslogFormatterConfig;
  errors: FormErrors;
  onChange: (config: SyslogFormatterConfig) => void;
}

interface StructuredDataElementProps {
  value: SyslogStructuredData;
  errors: FormErrors;
  elementIndex: number | undefined;
  onChange: (element: SyslogStructuredData) => void;
  onRemove: () => void;
}

/**
 * A row of an editor, keyed by the editor rather than by what the user
 * typed into it.
 */
interface Row<T> {
  key: string;
  value: T;
}

const rowOf = <T,>(value: T): Row<T> => ({ key: nanoid(), value });

const formatterError = (errors: FormErrors, path: string) =>
  errors[`formatter.${path}`];

const eventValueError = (errors: FormErrors, path: string) =>
  formatterError(errors, path) ?? formatterError(errors, `${path}.field`);

const structuredDataError = (
  errors: FormErrors,
  index: number | undefined,
  path: string
) =>
  index === undefined
    ? undefined
    : formatterError(errors, `structured_data.${index}.${path}`);

/**
 * Rows of an editor over a part of the config that cannot hold them all.
 * A row lives before it is filled in, and two rows may briefly say the
 * same thing while one is retyped - neither of which a mapping keyed by
 * what was typed, or a list of only valid entries, can carry. The rows
 * are the editor's; the config is derived from them, and takes them
 * back only when it is replaced from the outside.
 */
function useEditorRows<TRow, TValue>(
  value: TValue,
  toRows: (value: TValue) => Row<TRow>[],
  toValue: (rows: Row<TRow>[]) => TValue,
  onChange: (value: TValue) => void
): [Row<TRow>[], (rows: Row<TRow>[]) => void, (rows: Row<TRow>[]) => void] {
  const [rows, setRows] = useState<Row<TRow>[]>(() => toRows(value));

  const derived = useMemo(() => toValue(rows), [rows, toValue]);

  useEffect(() => {
    if (JSON.stringify(value) !== JSON.stringify(derived)) {
      setRows(toRows(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (next: Row<TRow>[]) => {
    setRows(next);
    onChange(toValue(next));
  };

  return [rows, commit, setRows];
}

interface ParamRow {
  name: string;
  value: string | EventFieldRef;
}

const paramRowsOf = (params: SyslogStructuredData['params']): Row<ParamRow>[] =>
  Object.entries(params ?? {}).map(([name, value]) => rowOf({ name, value }));

const paramsOf = (rows: Row<ParamRow>[]): SyslogStructuredData['params'] =>
  Object.fromEntries(
    rows
      .filter((row) => row.value.name !== '')
      .map((row) => [row.value.name, row.value.value])
  );

const StructuredDataElement: FC<StructuredDataElementProps> = ({
  value,
  errors,
  elementIndex,
  onChange,
  onRemove,
}) => {
  const [rows, updateRows, setRows] = useEditorRows<
    ParamRow,
    SyslogStructuredData['params']
  >(value.params ?? {}, paramRowsOf, paramsOf, (params) =>
    onChange({ ...value, params })
  );

  return (
    <Paper withBorder p="xs" radius="sm">
      <Stack gap="6px">
        <Group gap="4px" align="end" wrap="nowrap">
          <TextInput
            flex={1}
            label={
              <LabelWithTooltip
                label="Element id"
                tooltip="Identifier of the element, e.g. `origin@32473`"
              />
            }
            placeholder="id@enterprise"
            error={structuredDataError(errors, elementIndex, 'id')}
            value={value.id}
            onChange={(event) =>
              onChange({ ...value, id: event.currentTarget.value })
            }
          />
          <ActionIcon
            variant="transparent"
            c="red"
            size="36px"
            aria-label={`Remove element ${value.id}`}
            onClick={onRemove}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>

        {rows.length > 0 && (
          <Text size="xs" c="dimmed">
            Parameters
          </Text>
        )}

        {rows.map((row, index) => (
          <Group key={row.key} gap="4px" align="end" wrap="wrap">
            <TextInput
              flex="1 1 90px"
              aria-label="Parameter name"
              placeholder="name"
              error={structuredDataError(
                errors,
                elementIndex,
                `params.${row.value.name}`
              )}
              value={row.value.name}
              onChange={(event) =>
                updateRows(
                  rows.map((current, position) =>
                    position === index
                      ? {
                          ...current,
                          value: {
                            ...current.value,
                            name: event.currentTarget.value,
                          },
                        }
                      : current
                  )
                )
              }
            />
            <Group flex="2 1 130px" gap="4px" wrap="nowrap" align="end">
              <EventValueInput
                label="Parameter value"
                tooltip="Value of the parameter, written in place or taken from a field of the event"
                placeholder="value"
                hideLabel
                error={structuredDataError(
                  errors,
                  elementIndex,
                  `params.${row.value.name}.field`
                )}
                value={row.value.value}
                onChange={(next) =>
                  updateRows(
                    rows.map((current, position) =>
                      position === index
                        ? {
                            ...current,
                            value: { ...current.value, value: next ?? '' },
                          }
                        : current
                    )
                  )
                }
              />
              <ActionIcon
                variant="transparent"
                c="red"
                size="36px"
                aria-label={`Remove parameter ${row.value.name}`}
                onClick={() =>
                  updateRows(rows.filter((_, position) => position !== index))
                }
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Group>
        ))}

        <Button
          variant="subtle"
          size="compact-xs"
          leftSection={<IconPlus size={12} />}
          onClick={() => setRows([...rows, rowOf({ name: '', value: '' })])}
        >
          Add parameter
        </Button>
      </Stack>
    </Paper>
  );
};

export const SyslogFormatterParams: FC<SyslogFormatterParamsProps> = ({
  value,
  errors,
  onChange,
}) => {
  const update = (patch: Partial<SyslogFormatterConfig>) =>
    onChange({ ...value, ...patch });

  const isRfc3164 = value.rfc === RFC_3164;

  // An element is written into the config once it is named: the config
  // has no place for a nameless one, and the API takes it without a
  // word only for the generator to refuse it later.
  const [elementRows, updateElements, setElementRows] = useEditorRows<
    SyslogStructuredData,
    SyslogStructuredData[]
  >(
    value.structured_data ?? [],
    (list) => list.map((element) => rowOf(element)),
    (rows) => rows.filter((row) => row.value.id !== '').map((row) => row.value),
    (structured_data) =>
      update({
        structured_data:
          structured_data.length === 0 && value.structured_data === undefined
            ? undefined
            : structured_data,
      })
  );
  const elementConfigIndices = useMemo(() => {
    let configIndex = 0;

    return elementRows.map((row) =>
      row.value.id === '' ? undefined : configIndex++
    );
  }, [elementRows]);

  return (
    <Stack gap="xs">
      <SegmentedControl
        data={[
          { label: 'RFC 5424', value: String(RFC_5424) },
          { label: 'RFC 3164', value: String(RFC_3164) },
        ]}
        value={String(value.rfc ?? RFC_5424)}
        onChange={(picked) =>
          update(
            picked === String(RFC_3164)
              ? {
                  rfc: RFC_3164,
                  // Neither of them is a part of RFC 3164, and the
                  // backend rejects a config that keeps them.
                  msgid: undefined,
                  structured_data: undefined,
                  bom: undefined,
                }
              : { rfc: RFC_5424 }
          )
        }
      />

      <Group grow wrap="nowrap" align="start">
        <EventValueInput
          label="Facility"
          tooltip="Facility of the message, default is `user`"
          placeholder="facility"
          options={SYSLOG_FACILITIES}
          error={eventValueError(errors, 'facility')}
          value={nameOfCode(value.facility, SYSLOG_FACILITIES)}
          onChange={(next) =>
            update({ facility: next as SyslogFormatterConfig['facility'] })
          }
        />
        <EventValueInput
          label="Severity"
          tooltip="Severity of the message, default is `info`"
          placeholder="severity"
          options={SYSLOG_SEVERITIES}
          error={eventValueError(errors, 'severity')}
          value={nameOfCode(value.severity, SYSLOG_SEVERITIES)}
          onChange={(next) =>
            update({ severity: next as SyslogFormatterConfig['severity'] })
          }
        />
      </Group>

      <EventValueInput
        label="Hostname"
        tooltip="Host the message originates from, default is `-`"
        placeholder="hostname"
        error={eventValueError(errors, 'hostname')}
        value={value.hostname}
        onChange={(next) => update({ hostname: next })}
      />

      <Group grow wrap="nowrap" align="start">
        <EventValueInput
          label={isRfc3164 ? 'Tag' : 'App name'}
          tooltip={
            isRfc3164
              ? 'Tag of the message, default is `-` which leaves the message without one'
              : 'Application the message originates from, default is `-`'
          }
          placeholder="app name"
          error={eventValueError(errors, 'app_name')}
          value={value.app_name}
          onChange={(next) => update({ app_name: next })}
        />
        <EventValueInput
          label="Process id"
          tooltip="Process id of the application, default is `-`"
          placeholder="process id"
          error={eventValueError(errors, 'procid')}
          value={value.procid}
          onChange={(next) => update({ procid: next })}
        />
      </Group>

      {!isRfc3164 && (
        <EventValueInput
          label="Message id"
          tooltip="Type of the message, default is `-`"
          placeholder="message id"
          error={eventValueError(errors, 'msgid')}
          value={value.msgid}
          onChange={(next) => update({ msgid: next })}
        />
      )}

      <TextInput
        label={
          <LabelWithTooltip
            label="Timestamp field"
            tooltip="Field of the event carrying the time of the message, the time of writing is used when it is not set"
          />
        }
        placeholder="event field"
        error={formatterError(errors, 'timestamp.field')}
        value={value.timestamp?.field ?? ''}
        onChange={(event) => {
          const field = event.currentTarget.value;
          update({ timestamp: field === '' ? undefined : { field } });
        }}
      />

      <Group grow wrap="nowrap" align="start">
        <TextInput
          label={
            <LabelWithTooltip
              label="Message field"
              tooltip="Field of the event carrying the message part, the event itself is the message when it is not set"
            />
          }
          placeholder="event field"
          error={formatterError(errors, 'message_field')}
          value={value.message_field ?? ''}
          onChange={(event) => {
            const field = event.currentTarget.value;
            update({ message_field: field === '' ? undefined : field });
          }}
        />
        <Select
          label={
            <LabelWithTooltip
              label="Message format"
              tooltip="Rendering of the event as the message part, `json` collapses it into a single line. Applies only while the message is the event itself, so a message field leaves it out of use."
            />
          }
          placeholder="format"
          data={SYSLOG_MESSAGE_FORMATS as unknown as string[]}
          clearable
          disabled={Boolean(value.message_field)}
          error={formatterError(errors, 'message_format')}
          value={value.message_format ?? null}
          onChange={(picked) =>
            update({
              message_format:
                (picked as SyslogFormatterConfig['message_format']) ??
                undefined,
            })
          }
        />
      </Group>

      {!isRfc3164 && (
        <>
          <Switch
            label={
              <LabelWithTooltip
                label="Prepend BOM"
                tooltip="Whether to mark the message part as UTF-8 encoded with a byte order mark"
              />
            }
            checked={value.bom === true}
            onChange={(event) =>
              update({
                bom: event.currentTarget.checked ? true : undefined,
              })
            }
          />

          <Paper withBorder p="xs">
            <Stack gap="xs">
              <Group justify="space-between" wrap="nowrap">
                <Text size="sm" fw="bold">
                  Structured data
                </Text>
                <Button
                  variant="subtle"
                  size="compact-xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={() =>
                    setElementRows([
                      ...elementRows,
                      rowOf({ id: '', params: {} }),
                    ])
                  }
                >
                  Add element
                </Button>
              </Group>

              {elementRows.length === 0 ? (
                <Text size="xs" c="dimmed">
                  Without an element the message carries `-` in their place.
                </Text>
              ) : (
                elementRows.map((row, index) => (
                  <StructuredDataElement
                    key={row.key}
                    value={row.value}
                    errors={errors}
                    elementIndex={elementConfigIndices[index]}
                    onChange={(next) =>
                      updateElements(
                        elementRows.map((current, position) =>
                          position === index
                            ? { ...current, value: next }
                            : current
                        )
                      )
                    }
                    onRemove={() =>
                      updateElements(
                        elementRows.filter((_, position) => position !== index)
                      )
                    }
                  />
                ))
              )}
            </Stack>
          </Paper>
        </>
      )}
    </Stack>
  );
};
