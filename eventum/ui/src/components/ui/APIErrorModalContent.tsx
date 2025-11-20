import { CodeHighlight } from '@mantine/code-highlight';
import { Code, Divider, Stack, Text } from '@mantine/core';
import { FC } from 'react';

import { APIError } from '@/api/errors';

export interface APIErrorModalContentProps {
  error: unknown;
}

export const APIErrorModalContent: FC<APIErrorModalContentProps> = ({
  error,
  // eslint-disable-next-line sonarjs/cognitive-complexity
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
              Base URL: <Code>{error.requestConfig.baseURL ?? '-'}</Code>
            </Text>
            <Text size="sm">
              URL: <Code>{error.requestConfig.url ?? '-'}</Code>
            </Text>
            <Text size="sm">
              Method:{' '}
              <Code>{error.requestConfig.method?.toUpperCase() ?? '-'}</Code>
            </Text>
            <Text size="sm">Headers:</Text>
            <CodeHighlight
              language="json"
              code={JSON.stringify(error.requestConfig.headers, undefined, 2)}
              withExpandButton
              defaultExpanded={false}
              expandCodeLabel="Expand"
              collapseCodeLabel="Collapse"
            />

            <Text size="sm">Body:</Text>

            {typeof error.requestConfig.data === 'string' ? (
              <CodeHighlight
                language="json"
                code={JSON.stringify(
                  JSON.parse(error.requestConfig.data),
                  undefined,
                  2
                )}
                withExpandButton
                defaultExpanded={false}
                expandCodeLabel="Expand"
                collapseCodeLabel="Collapse"
              />
            ) : (
              <Code block>
                {error.requestConfig.data === undefined
                  ? 'Empty'
                  : 'Cannot show'}
              </Code>
            )}
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

            <Text size="sm">
              Code: <Code>{error.response.status}</Code>
            </Text>

            <Text size="sm">Headers:</Text>
            <CodeHighlight
              language="json"
              code={JSON.stringify(error.response.headers, undefined, 2)}
              withExpandButton
              defaultExpanded={false}
              expandCodeLabel="Expand"
              collapseCodeLabel="Collapse"
            />

            <Text size="sm">Body:</Text>
            {error.response.data !== undefined ? (
              <CodeHighlight
                language="json"
                code={JSON.stringify(error.response.data, undefined, 2)}
                withExpandButton
                defaultExpanded={false}
                expandCodeLabel="Expand"
                collapseCodeLabel="Collapse"
              />
            ) : (
              <Code block>
                <i>Empty</i>
              </Code>
            )}
          </Stack>
        ) : (
          <></>
        )}
      </Stack>
    );
  } else if (error instanceof Error) {
    return <>{error.message}</>;
  } else {
    return <>Unknown error: {typeof error}</>;
  }
};
