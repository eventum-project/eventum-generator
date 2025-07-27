import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { BrowserRouter } from 'react-router-dom';

import AppRouter from '@/routing';

export default function App() {
  return (
    <MantineProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </MantineProvider>
  );
}
