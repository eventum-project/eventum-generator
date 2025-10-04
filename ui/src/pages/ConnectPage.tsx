import {
  Autocomplete,
  Button,
  Center,
  Container,
  Grid,
  Input,
  NumberInput,
  Paper,
  PasswordInput,
  SegmentedControl,
  Stack,
  TextInput,
  Title,
} from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import validator from 'validator';

import { ApiClient } from '@/api/client';

export default function ConnectPage() {
  const navigate = useNavigate();
  const [recentHosts, setRecentHosts] = useState<string[]>([]);

  const form = useForm({
    initialValues: {
      protocol: 'https' as 'http' | 'https',
      host: '',
      port: 9474 as number,
      username: '',
      password: '',
    },
    validate: {
      host: (value) =>
        validator.isIP(value) ||
        validator.isFQDN(value, {
          require_tld: false,
          allow_underscores: true,
        })
          ? null
          : 'Invalid hostname or IP address',
      port: isNotEmpty('Port is required'),
      username: isNotEmpty('Username is required'),
      password: isNotEmpty('Password is required'),
    },
    validateInputOnChange: true,
    onSubmitPreventDefault: 'always',
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eventum_recent_hosts');

      if (raw) {
        const parsed: unknown = JSON.parse(raw);

        if (Array.isArray(parsed)) {
          setRecentHosts(
            parsed.filter((x) => typeof x === 'string').slice(0, 10)
          );
        }
      }
    } catch {
      /* empty */
    }
  }, []);

  function handleSubmit(values: typeof form.values) {
    const hostname = values.host.trim();
    if (hostname) {
      const next = [
        hostname,
        ...recentHosts.filter((h) => h !== hostname),
      ].slice(0, 5);
      setRecentHosts(next);
      try {
        localStorage.setItem('eventum_recent_hosts', JSON.stringify(next));
      } catch {}
    }
    console.log(values);
    // void navigate('/');
    let client = new ApiClient(form.values);
    console.log(client.getInstanceInfo());
  }

  return (
    <Center h="100vh" w="100vw">
      <Container size="xs">
        <Paper withBorder shadow="md" radius="md" p="xl">
          <form>
            <Stack>
              <Title order={2} ta="center" fw="normal">
                Connect to Eventum
              </Title>

              <Grid>
                <Grid.Col span={4}>
                  <Input.Wrapper label="Protocol" withAsterisk>
                    <SegmentedControl
                      fullWidth
                      size="sm"
                      data={[
                        { label: 'http', value: 'http' },
                        { label: 'https', value: 'https' },
                      ]}
                      value={form.values.protocol}
                      {...form.getInputProps('protocol')}
                    />
                  </Input.Wrapper>
                </Grid.Col>
                <Grid.Col span={5}>
                  <Autocomplete
                    label="Host"
                    placeholder="hostname or ip"
                    withAsterisk
                    data={recentHosts}
                    {...form.getInputProps('host')}
                  />
                </Grid.Col>
                <Grid.Col span={3}>
                  <NumberInput
                    label="Port"
                    placeholder="1 - 65 535"
                    withAsterisk
                    hideControls
                    min={1}
                    max={65_535}
                    {...form.getInputProps('port')}
                  />
                </Grid.Col>
              </Grid>

              <TextInput
                label="Username"
                withAsterisk
                {...form.getInputProps('username')}
              />

              <PasswordInput
                label="Password"
                withAsterisk
                {...form.getInputProps('password')}
              />

              <Button
                mt="lg"
                type="submit"
                fullWidth
                variant="gradient"
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(form.values);
                }}
              >
                Connect
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Center>
  );
}
