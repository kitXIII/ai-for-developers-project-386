import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Registers the Russian locale for the calendar; the component itself gets
// locale="ru" (import alone only registers it).
import 'dayjs/locale/ru';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { MessagesProvider } from './lib/i18n';
import { router } from './router';

const theme = createTheme({ primaryColor: 'teal' });

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <QueryClientProvider client={queryClient}>
        {/* The catalog gates the router: no view renders before the texts arrive. */}
        <MessagesProvider>
          <RouterProvider router={router} />
        </MessagesProvider>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
);
