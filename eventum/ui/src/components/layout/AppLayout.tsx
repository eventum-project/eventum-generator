'use client';

import {
  ActionIcon,
  Alert,
  AppShell,
  Avatar,
  Badge,
  Box,
  Breadcrumbs,
  Button,
  Center,
  CopyButton,
  Divider,
  Group,
  Image,
  Loader,
  Menu,
  Modal,
  NavLink,
  Stack,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertSquareRounded,
  IconBook,
  IconBox,
  IconBrandPython,
  IconBug,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconCopy,
  IconFolder,
  IconHome,
  IconInfoCircle,
  IconLock,
  IconLogout,
  IconPlayerPlay,
  IconRepeat,
  IconServer,
  IconSettings,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useCurrentUser, useLogoutMutation } from '@/api/hooks/useAuth';
import { useInstanceInfo } from '@/api/hooks/useInstance';
import ThemeToggle from '@/components/ThemeToggle';
import { LINKS } from '@/routing/links';
import { ROUTE_PATHS } from '@/routing/paths';

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const [openedAboutModel, { open: openAboutModal, close: closeAboutModal }] =
    useDisclosure(false);
  const logout = useLogoutMutation();
  const {
    data: instanceInfo,
    isLoading: isInstanceInfoLoading,
    isSuccess: isInstanceInfoSuccess,
    isError: isInstanceInfoError,
    error: instanceInfoError,
  } = useInstanceInfo();

  const navigationData = [
    {
      groupName: 'Generators',
      items: [
        {
          label: 'Instances',
          icon: IconPlayerPlay,
          pathname: ROUTE_PATHS.INSTANCES,
        },
        {
          label: 'Projects',
          icon: IconFolder,
          pathname: ROUTE_PATHS.PROJECTS,
        },
        {
          label: 'Startup',
          icon: IconRepeat,
          pathname: ROUTE_PATHS.STARTUP,
        },
      ],
    },
    {
      groupName: 'Management',
      items: [
        {
          label: 'Secrets',
          icon: IconLock,
          pathname: ROUTE_PATHS.SECRETS,
        },
        {
          label: 'Settings',
          icon: IconSettings,
          pathname: ROUTE_PATHS.SETTINGS,
        },
      ],
    },
  ];

  const bottomNavigationData = [
    {
      label: 'Documentation',
      icon: IconBook,
      link: LINKS.DOCUMENTATION,
    },
    {
      label: 'Join the community',
      icon: IconUsersGroup,
      link: LINKS.TG_COMMUNITY_GROUP,
    },
    {
      label: 'Report an issue',
      icon: IconBug,
      link: LINKS.GITHUB_ISSUES,
    },
  ];

  return (
    <AppShell
      padding="md"
      header={{ height: 60 }}
      navbar={{
        width: 220,
        breakpoint: 'sm',
      }}
    >
      <AppShell.Header>
        <Group justify="space-between" h="100%" ml="xs" mr="xl">
          <Group>
            <Group
              gap="xs"
              onClick={() => void navigate(ROUTE_PATHS.MAIN)}
              style={{ cursor: 'pointer' }}
            >
              <Box>
                <Image
                  src="/logo.svg"
                  alt="Eventum Logo"
                  h={27}
                  w="auto"
                  fit="contain"
                  mx="auto"
                  draggable={false}
                />
              </Box>
              <Box>
                <Title fz="lg" fw="normal">
                  Eventum Studio
                </Title>
              </Box>
            </Group>
            <Breadcrumbs
              ml="40px"
              separator={<IconChevronRight size={'16px'} />}
              separatorMargin="0"
            >
              {location.pathname
                .split('/')
                .slice(1)
                .map((item, index) => (
                  <Box
                    key={item}
                    style={{
                      cursor: 'pointer',
                    }}
                  >
                    <Badge
                      variant="light"
                      radius="sm"
                      style={{
                        textTransform: index === 0 ? 'capitalize' : 'none',
                      }}
                    >
                      {item === '' ? 'Overview' : item}
                    </Badge>
                  </Box>
                ))}
            </Breadcrumbs>
          </Group>
          <Group>
            <ThemeToggle />
            <Box ml="sm">
              <Menu>
                <Menu.Target>
                  <UnstyledButton>
                    <Group gap="xs">
                      <Stack gap="0">
                        <Group gap="0">
                          <Text size="sm" fw={600} mr="2px">
                            {user}
                          </Text>
                          <IconChevronDown size="16px" />
                        </Group>
                        <Text size="xs" fw={500}>
                          Internal user
                        </Text>
                      </Stack>

                      <Avatar ml="0" color="primary">
                        {isUserLoading ? (
                          <Loader size="xs" />
                        ) : (
                          user?.charAt(0).toUpperCase()
                        )}
                      </Avatar>
                    </Group>
                  </UnstyledButton>
                </Menu.Target>

                <Menu.Dropdown w="195px">
                  <Menu.Label>Application</Menu.Label>
                  <Menu.Item
                    leftSection={<IconInfoCircle size="19px" />}
                    onClick={openAboutModal}
                  >
                    About
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    leftSection={<IconLogout size="19px" />}
                    onClick={() =>
                      logout.mutate(undefined, {
                        onSuccess: () => void navigate(ROUTE_PATHS.SIGNIN),
                        onError: (error) =>
                          notifications.show({
                            title: 'Sign out failed',
                            message: error.message,
                            color: 'red',
                          }),
                      })
                    }
                  >
                    Sign out
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Box>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar>
        <Stack gap="0" h="100%" justify="space-between">
          <Box>
            <NavLink
              label="Overview"
              leftSection={<IconHome size="19px" />}
              active={location.pathname === ROUTE_PATHS.MAIN}
              onClick={() => void navigate(ROUTE_PATHS.MAIN)}
            />
            {navigationData.map((group) => (
              <Box key={group.groupName}>
                <Divider />
                <NavLink label={group.groupName} defaultOpened>
                  {group.items.map((item) => (
                    <NavLink
                      label={item.label}
                      key={item.label}
                      leftSection={<item.icon size="19px" />}
                      active={location.pathname == item.pathname}
                      onClick={() => void navigate(item.pathname)}
                    />
                  ))}
                </NavLink>
              </Box>
            ))}
          </Box>
          <Box>
            {bottomNavigationData.map((item) => (
              <NavLink
                label={item.label}
                key={item.label}
                leftSection={<item.icon size="19px" />}
                href={item.link}
                target="_blank"
              />
            ))}
          </Box>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Modal
          opened={openedAboutModel}
          onClose={closeAboutModal}
          title={<Title order={4}>About Eventum</Title>}
          size="lg"
        >
          {isInstanceInfoLoading ? (
            <Center>
              <Loader />
            </Center>
          ) : (
            <></>
          )}
          {isInstanceInfoError ? (
            <Alert
              mt="md"
              variant="default"
              icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
              title="Failed to get instance information"
            >
              {instanceInfoError.message}
            </Alert>
          ) : (
            <></>
          )}
          {isInstanceInfoSuccess ? (
            <Stack>
              {[
                {
                  sectionName: 'Application',
                  icon: IconBox,
                  sectionItems: [
                    { label: 'Version', value: instanceInfo.app_version },
                  ],
                },
                {
                  sectionName: 'Python',
                  icon: IconBrandPython,
                  sectionItems: [
                    { label: 'Version', value: instanceInfo.python_version },
                    {
                      label: 'Implementation',
                      value: instanceInfo.python_implementation,
                    },
                    { label: 'Compiler', value: instanceInfo.python_compiler },
                  ],
                },
                {
                  sectionName: 'Server',
                  icon: IconServer,
                  sectionItems: [
                    {
                      label: 'Platform',
                      value: instanceInfo.platform,
                    },
                    {
                      label: 'Boot time',
                      value: new Date(
                        instanceInfo.boot_timestamp * 1000
                      ).toLocaleString(),
                    },
                  ],
                },
              ].map((section, index, arr) => (
                <Stack key={section.sectionName}>
                  <Group mt="sm">
                    <section.icon />
                    <Title order={5} fw={600}>
                      {section.sectionName}
                    </Title>
                  </Group>
                  {
                    <Stack gap="xs">
                      {section.sectionItems.map((sectionItem) => (
                        <Group key={sectionItem.label}>
                          <Text>
                            {sectionItem.label}: {sectionItem.value}
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                  }
                  {index < arr.length - 1 ? <Divider /> : <></>}
                </Stack>
              ))}
              <Group justify="flex-end" mt="xs" gap="xs">
                <CopyButton value={JSON.stringify(instanceInfo, undefined, 2)}>
                  {({ copied, copy }) => (
                    <Tooltip
                      label={copied ? 'Copied' : 'Copy full info'}
                      withArrow
                      position="left"
                    >
                      <ActionIcon
                        color={copied ? 'teal' : 'gray'}
                        variant={copied ? 'filled' : 'default'}
                        onClick={copy}
                        size="lg"
                      >
                        {copied ? (
                          <IconCheck size={16} />
                        ) : (
                          <IconCopy size={16} />
                        )}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
                <Button onClick={closeAboutModal}>Close</Button>
              </Group>
            </Stack>
          ) : (
            <></>
          )}
        </Modal>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
