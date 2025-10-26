import {
  MantineColorsTuple,
  MantineProvider,
  createTheme,
} from '@mantine/core';
import '@mantine/core/styles.css';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';

import '@/index.css';
import AppRouter from '@/routing';

const primaryColorTuple: MantineColorsTuple = [
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
  fontFamily: 'Montserrat, sans-serif',
  defaultRadius: 'md',
  cursorType: 'pointer',
  colors: {
    primary: primaryColorTuple,
  },
  primaryColor: 'primary',
  primaryShade: 3,
  defaultGradient: {
    from: '#8282ef',
    to: '#69ced0',
    deg: 14,
  },
});

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <Notifications />
        <ModalsProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </ModalsProvider>
      </MantineProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
