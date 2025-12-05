// sort-imports-ignore
import {
  CodeHighlight,
  CodeHighlightAdapterProvider,
  createShikiAdapter,
} from '@mantine/code-highlight';
import {
  MantineThemeProvider,
  MantineColorsTuple,
  MantineProvider,
  MantineThemeOverride,
  createTheme,
  useMantineColorScheme,
} from '@mantine/core';

import '@mantine/core/styles.css';
import '@mantine/code-highlight/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/charts/styles.css';
import '@/index.css';

import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';

import AppRouter from '@/routing';
import { useMemo } from 'react';

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

async function loadShiki() {
  const { createHighlighter } = await import('shiki');
  const shiki = await createHighlighter({
    langs: ['json', 'yml'],
    themes: ['dark-plus', 'light-plus'],
  });

  return shiki;
}
const shikiAdapter = createShikiAdapter(loadShiki);

function InnerApp() {
  const { colorScheme } = useMantineColorScheme();

  const innerTheme = useMemo(
    () =>
      ({
        components: {
          CodeHighlight: CodeHighlight.extend({
            defaultProps: {
              codeColorScheme:
                colorScheme === 'dark' ? 'dark-plus' : 'light-plus',
            },
          }),
        },
      }) as MantineThemeOverride,
    [colorScheme]
  );

  return (
    <MantineThemeProvider theme={innerTheme}>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </MantineThemeProvider>
  );
}
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <CodeHighlightAdapterProvider adapter={shikiAdapter}>
          <Notifications />
          <ModalsProvider>
            <InnerApp />
          </ModalsProvider>
        </CodeHighlightAdapterProvider>
      </MantineProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
