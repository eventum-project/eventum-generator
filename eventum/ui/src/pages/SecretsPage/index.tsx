import { Alert, Box, Center, Container, Loader, Table } from '@mantine/core';
import { IconAlertSquareRounded } from '@tabler/icons-react';

import { NewSecretRow } from './NewSecretRow';
import TableRow from './TableRow';
import { useSecretNames } from '@/api/hooks/useSecrets';
import { PageTitle } from '@/components/ui/PageTitle';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';

export default function SecretsPage() {
  const {
    data: secretNames,
    isLoading: isSecretNamesLoading,
    isError: isSecretNamesError,
    error: secretNamesError,
    isSuccess: isSecretNamesSuccess,
  } = useSecretNames();

  if (isSecretNamesLoading) {
    return (
      <Center>
        <Loader size="lg" />
      </Center>
    );
  }

  if (isSecretNamesError) {
    return (
      <Container size="md" mt="lg">
        <PageTitle title="Secrets" />
        <Alert
          variant="default"
          icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
          title="Failed to load list of secrets"
        >
          {secretNamesError.message}
          <ShowErrorDetailsAnchor error={secretNamesError} prependDot />
        </Alert>
      </Container>
    );
  }

  if (isSecretNamesSuccess) {
    return (
      <Container size="lg" mb="400px">
        <PageTitle title="Secrets" />
        <Table mt="md" highlightOnHover stickyHeader stickyHeaderOffset={60}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Value</Table.Th>
              <Table.Th style={{ width: '1%', whiteSpace: 'nowrap' }}>
                Actions
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {secretNames.map((item) => (
              <TableRow key={item} name={item} />
            ))}
            <NewSecretRow />
          </Table.Tbody>
        </Table>
      </Container>
    );
  }

  return <></>;
}
