import {
  ActionIcon,
  CopyButton,
  FloatingPosition,
  MantineSize,
  Tooltip,
} from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { FC } from 'react';

interface ResponsibleCopyButtonProps {
  content: string;
  label: string;
  tooltipPosition?: FloatingPosition;
  // eslint-disable-next-line sonarjs/no-useless-intersection
  size?: number | (string & {}) | MantineSize;
}

export const ResponsibleCopyButton: FC<ResponsibleCopyButtonProps> = ({
  content,
  label,
  tooltipPosition = 'left',
  size = 'md',
}) => {
  return (
    <CopyButton value={content}>
      {({ copied, copy }) => (
        <Tooltip
          label={copied ? 'Copied' : label}
          withArrow
          position={tooltipPosition}
        >
          <ActionIcon
            color={copied ? 'teal' : 'gray'}
            variant={copied ? 'filled' : 'default'}
            onClick={copy}
            size={size}
          >
            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          </ActionIcon>
        </Tooltip>
      )}
    </CopyButton>
  );
};
