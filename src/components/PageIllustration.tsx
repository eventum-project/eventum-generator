import { Box } from '@mantine/core';

export default function PageIllustration({
  SvgComponent,
}: Readonly<{
  SvgComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
}>) {
  return (
    <Box
      component={SvgComponent}
      w={{
        base: '50vw',
        xs: '50vw',
        sm: '40vw',
        md: '30vw',
        lg: '25vw',
        xl: '20vw',
      }}
      h="auto"
    />
  );
}
