import {
  ActionIcon,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';

export default function ThemeToggle() {
  const { toggleColorScheme } = useMantineColorScheme({
    keepTransitions: true,
  });
  const computedColorScheme = useComputedColorScheme('light');

  const dark = computedColorScheme === 'dark';

  return (
    <ActionIcon
      onClick={toggleColorScheme}
      variant="outline"
      title={`Switch to ${dark ? 'light' : 'dark'} mode`}
      size="lg"
    >
      {dark ? <IconSun size={20} /> : <IconMoon size={20} />}
    </ActionIcon>
  );
}
