import { AppShell } from '@mantine/core';

export default function BlankLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppShell>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
