import { Button, Center, Container, Title } from '@mantine/core';
import { useNavigate } from 'react-router-dom';

import NotFoundSvg from '@/assets/notFound.svg?react';
import PageIllustration from '@/components/ui/PageIllustration';

export default function NotFound() {
  const navigate = useNavigate();

  const handleClick = async () => {
    await navigate('/');
  };

  return (
    <Center
      h="100vh"
      w="100vw"
      flex="column"
      style={{ flexDirection: 'column', textAlign: 'center' }}
    >
      <Container>
        <PageIllustration SvgComponent={NotFoundSvg} />
        <Title order={2} mb="md">
          Page Not Found
        </Title>
        <Button size="md" onClick={() => void handleClick()}>
          Go Back
        </Button>
      </Container>
    </Center>
  );
}
