import { Box, TableOfContents } from '@mantine/core';
import { FC } from 'react';

interface FloatingTableOfContentsProps {
  selector?: string;
}

export const FloatingTableOfContents: FC<FloatingTableOfContentsProps> = ({
  selector = ':is(h2)',
}) => {
  return (
    <Box
      style={{
        position: 'sticky',
        top: 80,
        alignSelf: 'flex-start',
      }}
    >
      <TableOfContents
        variant="filled"
        size="sm"
        radius="sm"
        scrollSpyOptions={{ selector: selector }}
        getControlProps={({ data }) => ({
          onClick: () => data.getNode().scrollIntoView({ behavior: 'smooth' }),
          children: data.value,
        })}
      />
    </Box>
  );
};
