import { ActionIcon, Group, Select, TextInput, Tooltip } from '@mantine/core';
import { IconBraces, IconLetterCase } from '@tabler/icons-react';
import { FC, ReactNode, useState } from 'react';

import { EventFieldRef } from '@/api/routes/generator-configs/schemas/plugins/output/formatters';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';

type EventValue = string | number | EventFieldRef | undefined;

interface EventValueInputProps {
  label: string;
  tooltip: string;
  placeholder?: string;
  /** Values the static mode offers instead of free text. */
  options?: readonly string[];
  /** Keep the label out of the row, e.g. under one already shown. */
  hideLabel?: boolean;
  value: EventValue;
  onChange: (value: string | EventFieldRef | undefined) => void;
}

interface ValueInputProps {
  labelProps: Record<string, unknown>;
  placeholder?: string;
  options?: readonly string[];
  /** The mode switch, carried inside the field it belongs to. */
  toggle: ReactNode;
  value: EventValue;
  onChange: (value: string | undefined) => void;
}

const isFieldRef = (value: EventValue): value is EventFieldRef =>
  Boolean(value) && typeof value === 'object';

/** The value as it is written in place: picked from a list, or typed. */
const StaticValueInput: FC<ValueInputProps> = ({
  labelProps,
  placeholder,
  options,
  toggle,
  value,
  onChange,
}) => {
  const text = isFieldRef(value) ? '' : (value?.toString() ?? '');

  if (options) {
    return (
      <Select
        flex={1}
        {...labelProps}
        placeholder={placeholder}
        data={options as unknown as string[]}
        clearable
        searchable
        leftSection={toggle}
        leftSectionWidth={34}
        leftSectionPointerEvents="all"
        value={text === '' ? null : text}
        onChange={(picked) => onChange(picked ?? undefined)}
      />
    );
  }

  return (
    <TextInput
      flex={1}
      {...labelProps}
      placeholder={placeholder}
      rightSection={toggle}
      rightSectionWidth={34}
      rightSectionPointerEvents="all"
      value={text}
      onChange={(event) => {
        const typed = event.currentTarget.value;
        onChange(typed === '' ? undefined : typed);
      }}
    />
  );
};

/**
 * Input of a value that is either written in place or taken from a
 * field of the event under generation.
 */
export const EventValueInput: FC<EventValueInputProps> = ({
  label,
  tooltip,
  placeholder,
  options,
  hideLabel = false,
  value,
  onChange,
}) => {
  const [takenFromEvent, setTakenFromEvent] = useState(isFieldRef(value));
  const fromEvent =
    isFieldRef(value) || (takenFromEvent && value === undefined);

  // The icon names the mode the field is in; the tooltip names what
  // pressing it does.
  const toggleLabel = fromEvent
    ? `Switch ${label.toLowerCase()} to a value written in place`
    : `Switch ${label.toLowerCase()} to a field of the event`;

  // A hidden label still names the input for anyone not reading it.
  const labelProps = hideLabel
    ? { 'aria-label': label }
    : { label: <LabelWithTooltip label={label} tooltip={tooltip} /> };

  const toggle = (
    <Tooltip label={toggleLabel} withArrow openDelay={200}>
      <ActionIcon
        variant="subtle"
        size="sm"
        aria-label={toggleLabel}
        onClick={() => {
          setTakenFromEvent(!fromEvent);
          // eslint-disable-next-line unicorn/no-useless-undefined
          onChange(undefined);
        }}
      >
        {fromEvent ? (
          <IconBraces size={16} />
        ) : (
          <IconLetterCase size={16} />
        )}
      </ActionIcon>
    </Tooltip>
  );

  return (
    <Group gap="4px" align="end" wrap="nowrap" flex={1}>
      {fromEvent ? (
        <TextInput
          flex={1}
          {...labelProps}
          placeholder="event field"
          rightSection={toggle}
          rightSectionWidth={34}
          rightSectionPointerEvents="all"
          value={isFieldRef(value) ? value.field : ''}
          onChange={(event) => {
            const field = event.currentTarget.value;
            onChange(field === '' ? undefined : { field });
          }}
        />
      ) : (
        <StaticValueInput
          labelProps={labelProps}
          placeholder={placeholder}
          options={options}
          toggle={toggle}
          value={value}
          onChange={onChange}
        />
      )}
    </Group>
  );
};
