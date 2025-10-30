import { Code, Divider, Spoiler, Stack, Text } from '@mantine/core';
import { FC } from 'react';

import { APIError } from '@/api/errors';

interface APIErrorModalContentProps {
  error: APIError | Error;
}

export const APIErrorModalContent: FC<APIErrorModalContentProps> = ({
  error,
}) => {
  if (error instanceof APIError) {
    return (
      <Stack gap="sm">
        <Stack gap="4px">
          <Text size="sm">{error.message}</Text>
          <Text size="sm">Details: {error.details ?? '-'}</Text>
        </Stack>
        {error.response !== undefined && error.requestConfig !== undefined ? (
          <Stack gap="4px">
            <Text size="sm" fw="bold" mt="sm">
              Request info
            </Text>

            <Divider my="6px" />

            <Text size="sm">
              Base URL: {error.requestConfig.baseURL ?? '-'}
            </Text>
            <Text size="sm">URL: {error.requestConfig.url ?? '-'}</Text>
            <Text size="sm">
              Method: {error.requestConfig.method?.toUpperCase() ?? '-'}
            </Text>
            <Text size="sm">Headers:</Text>
            <Spoiler
              maxHeight={95}
              showLabel={<Text size="sm">Show more</Text>}
              hideLabel={<Text size="sm">Hide</Text>}
            >
              <Code block>
                {JSON.stringify(error.requestConfig.headers, undefined, 2)}
              </Code>
            </Spoiler>

            <Text size="sm">Body:</Text>
            <Spoiler
              maxHeight={95}
              showLabel={<Text size="sm">Show more</Text>}
              hideLabel={<Text size="sm">Hide</Text>}
            >
              <Code block>
                {error.requestConfig.data !== undefined ? (
                  JSON.stringify(error.requestConfig.data, undefined, 2)
                ) : (
                  <i>Empty</i>
                )}
              </Code>
            </Spoiler>
          </Stack>
        ) : (
          <></>
        )}
        {error.response !== undefined ? (
          <Stack gap="4px">
            <Text size="sm" fw="bold" mt="sm">
              Response info
            </Text>

            <Divider my="4px" />

            <Text size="sm">Code: {error.response.status}</Text>

            <Text size="sm">Headers:</Text>
            <Spoiler
              maxHeight={95}
              showLabel={<Text size="sm">Show more</Text>}
              hideLabel={<Text size="sm">Hide</Text>}
            >
              <Code block>
                {JSON.stringify(error.response.headers, undefined, 2)}
              </Code>
            </Spoiler>

            <Text size="sm">Body:</Text>
            <Spoiler
              maxHeight={95}
              showLabel={<Text size="sm">Show more</Text>}
              hideLabel={<Text size="sm">Hide</Text>}
            >
              <Code block>
                {error.response.data !== undefined ? (
                  JSON.stringify(error.response.data, undefined, 2)
                ) : (
                  <i>Empty</i>
                )}
              </Code>
            </Spoiler>
          </Stack>
        ) : (
          <></>
        )}
      </Stack>
    );
  } else {
    return <>{error.message}</>;
  }
};
