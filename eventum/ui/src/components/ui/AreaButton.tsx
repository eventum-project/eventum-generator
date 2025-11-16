import { Button, Group, Stack, Text } from '@mantine/core';
import { Icon } from '@tabler/icons-react';
import { FC } from 'react';

interface AreaButtonProps {
  icon: Icon;
  name: string;
  description: string;
  onClick: () => void;
}

export const AreaButton: FC<AreaButtonProps> = ({
  icon: ButtonIcon,
  name,
  description,
  onClick,
}) => {
  return (
    <Button variant="default" h="100px" onClick={onClick}>
      <Stack gap="xs" align="center">
        <Group gap="xs">
          <ButtonIcon size={18} />
          {name}
        </Group>
        <Text fz="sm" c="gray.6">
          {description}
        </Text>
      </Stack>
    </Button>
  );
};
