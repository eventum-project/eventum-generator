import {
  Alert,
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
import { IconAlertSquareRounded } from '@tabler/icons-react';
import { AxiosError } from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ZodError } from 'zod';

import { useLoginMutation } from '@/api/hooks/useAuth';
import { ROUTE_PATHS } from '@/routing/paths';

export default function SignInPage() {
  const navigate = useNavigate();
  const [commonError, setCommonError] = useState<string | null>(null);

  const loginMutation = useLoginMutation();

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
    setCommonError(null);

    loginMutation.mutate(
      {
        username: values.username,
        password: values.password,
      },
      {
        onSuccess: () => {
          void navigate(ROUTE_PATHS.MAIN);
        },
        onError: (error: unknown) => {
          if (error instanceof AxiosError) {
            if (error?.status !== undefined && error.status >= 500) {
              setCommonError('Server error, try again later');
              return;
            }

            const responseData = error?.response?.data as
              | { detail?: string }
              | undefined;
            const detail = responseData?.detail;

            if (detail && typeof detail === 'string') {
              setCommonError(detail);
              return;
            }

            setCommonError(error.message);
          } else if (error instanceof ZodError) {
            setCommonError('Server respond with invalid data');
          } else {
            setCommonError('Failed to connect to server');
          }
        },
      }
    );
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

              {commonError && (
                <Alert
                  mt="md"
                  variant="default"
                  icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
                >
                  {commonError}
                </Alert>
              )}

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
                loading={loginMutation.isPending}
                disabled={loginMutation.isPending}
              >
                Sign In
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Center>
  );
}
