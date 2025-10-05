import {
  Box,
  Button,
  Center,
  Container,
  Image,
  Paper,
  PasswordInput,
  Stack,
  TextInput,
  Title,
} from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useNavigate } from 'react-router-dom';

import { ApiClient } from '@/api/client';

export default function ConnectPage() {
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
    },
    validate: {
      username: isNotEmpty('Username is required'),
      password: isNotEmpty('Password is required'),
    },
    validateInputOnChange: true,
    onSubmitPreventDefault: 'always',
  });

  function handleSubmit(values: typeof form.values) {
    let client = new ApiClient(values);
    console.log(client);
    // void navigate('/');
  }

  return (
    <Center h="100vh" w="100vw">
      <Container>
        <Paper withBorder radius="md" w={'400px'}>
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack m="xl" gap="0">
              <Box ta="center">
                <Image
                  src="/logo.svg"
                  alt="Eventum Logo"
                  h={80}
                  w="auto"
                  fit="contain"
                  mx="auto"
                />
                <Title order={3} ta="center" fw="bold" mt="xs">
                  Sign in to Eventum
                </Title>
              </Box>

              <TextInput
                label="Username"
                withAsterisk
                {...form.getInputProps('username')}
                mt="lg"
              />

              <PasswordInput
                label="Password"
                withAsterisk
                {...form.getInputProps('password')}
                mt="5px"
              />

              <Button
                type="submit"
                fullWidth
                variant="gradient"
                mt="xl"
                mb="xs"
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
