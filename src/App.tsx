import {
  MantineColorsTuple,
  MantineProvider,
  colorsTuple,
  createTheme,
} from '@mantine/core';
import '@mantine/core/styles.css';
import { MantineEmotionProvider } from '@mantine/emotion';
import { BrowserRouter } from 'react-router-dom';

import AppRouter from '@/routing';

const mainColorTuple: MantineColorsTuple = [
  '#ececff',
  '#d4d5fd',
  '#a7a7f5',
  '#8282ef',
  '#4d4de7',
  '#3332e4',
  '#2525e3',
  '#1819ca',
  '#1015b6',
  '#0211a0',
];

const theme = createTheme({
  autoContrast: true,
  luminanceThreshold: 0.35,
  fontFamily: 'Montserrat, sans-serif',
  defaultRadius: 'md',
  cursorType: 'pointer',
  colors: {
    main: mainColorTuple,
  },
  primaryColor: 'main',
  primaryShade: 3,
  defaultGradient: {
    from: '#8282ef',
    to: '#69ced0',
    deg: 14,
  },
});

export default function App() {
  return (
    <MantineEmotionProvider>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </MantineProvider>
    </MantineEmotionProvider>
  );
}
