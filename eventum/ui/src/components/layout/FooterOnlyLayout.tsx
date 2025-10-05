import { Anchor, AppShell, Group, Text } from '@mantine/core';

import {
  GITHUB_ORGANIZATION,
  LICENSE,
  TG_COMMUNITY_GROUP,
} from '@/routing/links';

export default function FooterOnlyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const data = [
    {
      label: 'Documentation',
      link: 'https://eventum-project.github.io/website/',
    },
    {
      label: 'GitHub',
      link: GITHUB_ORGANIZATION,
    },
    {
      label: 'Community',
      link: TG_COMMUNITY_GROUP,
    },
  ];
  return (
    <AppShell>
      <AppShell.Main>{children}</AppShell.Main>
      <AppShell.Footer bd="0">
        <Group justify="space-between" mx="50px" my="20px">
          <Text c="dimmed" size="sm">
            © {new Date().getFullYear()} Eventum Project.{' '}
            <Anchor href={LICENSE} c="dimmed" lh={1} size="sm" target="_blank">
              All rights reserved.
            </Anchor>
          </Text>

          <Group gap="lg">
            {data.map((element) => (
              <Anchor
                key={element.label}
                href={element.link}
                c="dimmed"
                lh={1}
                size="sm"
                target="_blank"
              >
                {element.label}
              </Anchor>
            ))}
          </Group>
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}
