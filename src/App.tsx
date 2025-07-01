import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { BrowserRouter } from 'react-router-dom';

import AppRouter from '@/routes';

export default function App() {
  return (
    <MantineProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </MantineProvider>
  );
}
