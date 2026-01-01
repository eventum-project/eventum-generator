import { Title } from '@mantine/core';
import { FC } from 'react';

interface PageTitleProps {
  title: string;
}

export const PageTitle: FC<PageTitleProps> = ({ title }) => {
  return (
    <Title order={2} fw="normal">
      {title}
    </Title>
  );
};
