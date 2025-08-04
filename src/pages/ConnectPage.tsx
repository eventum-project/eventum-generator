import {
  Button,
  Center,
  Container,
  Grid,
  NumberInput,
  Paper,
  PasswordInput,
  Stack,
  TextInput,
  Title,
} from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useNavigate } from 'react-router-dom';
import validator from 'validator';

export default function ConnectPage() {
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      hostname: '',
      port: null,
      username: '',
      password: '',
    },
    validate: {
      hostname: (value) =>
        validator.isIP(value) ||
        validator.isFQDN(value, { require_tld: false, allow_underscores: true })
          ? null
          : 'Invalid host or IP address',
      port: isNotEmpty('Port is required'),
      username: isNotEmpty('Username is required'),
      password: isNotEmpty('Password is required'),
    },
    validateInputOnBlur: true,
    onSubmitPreventDefault: 'always',
  });

  function handleSubmit(values: typeof form.values) {
    console.log(values);
    void navigate('/');
  }

  return (
    <Center h="100vh" w="100vw">
      <Container size="xs">
        <Paper withBorder shadow="md" radius="md" p="xl">
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              <Title order={2} ta="center" fw="normal">
                Connect to Eventum
              </Title>

              <Grid>
                <Grid.Col span={9}>
                  <TextInput
                    label="Host"
                    placeholder="hostname or ip"
                    withAsterisk
                    {...form.getInputProps('hostname')}
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

              <Button mt="lg" type="submit" fullWidth variant="gradient">
                Connect
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Center>
  );
}
