import { ActionIcon, Group, StyleProp, Tooltip } from '@mantine/core';
import { IconHelp } from '@tabler/icons-react';
import { FC } from 'react';

interface LabelWithTooltipProps {
  label: string;
  tooltip: string;
  iconSize?: number;
  openDelay?: number;
  maw?: StyleProp<React.CSSProperties['width']>;
}

export const LabelWithTooltip: FC<LabelWithTooltipProps> = ({
  label,
  tooltip,
  iconSize = 14,
  openDelay = 200,
  maw = 300,
}) => (
  <Group gap={4} align="center" wrap="nowrap">
    {label}
    <Tooltip
      label={tooltip}
      withArrow
      position="right"
      multiline
      maw={maw}
      openDelay={openDelay}
    >
      <ActionIcon
        size="xs"
        variant="subtle"
        style={{ color: 'var(--mantine-color-text)' }}
        pb="2px"
      >
        <IconHelp size={iconSize} stroke={1.7} />
      </ActionIcon>
    </Tooltip>
  </Group>
);
