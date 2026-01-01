import { Anchor } from '@mantine/core';
import { modals } from '@mantine/modals';
import { FC } from 'react';

import {
  APIErrorModalContent,
  APIErrorModalContentProps,
} from './APIErrorModalContent';

interface ShowErrorDetailsAnchorProps {
  error: APIErrorModalContentProps['error'];
  prependDot?: boolean;
}

export const ShowErrorDetailsAnchor: FC<ShowErrorDetailsAnchorProps> = ({
  error,
  prependDot = false,
}) => {
  return (
    <>
      {prependDot ? '. ' : ''}
      <Anchor
        onClick={() =>
          modals.open({
            title: 'Error details',
            size: 'xl',
            children: <APIErrorModalContent error={error} />,
          })
        }
        size="sm"
      >
        Show details
      </Anchor>
    </>
  );
};
