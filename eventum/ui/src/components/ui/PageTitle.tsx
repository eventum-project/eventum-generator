import { Stack, Title } from '@mantine/core';
import { FC } from 'react';

interface PageTitleProps {
  title: string;
}

export const PageTitle: FC<PageTitleProps> = ({ title }) => {
  return (
    <Stack gap={0} mb="md">
      <Title order={2} fw="normal">
        {title}
      </Title>
    </Stack>
  );
};
