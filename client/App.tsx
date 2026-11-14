import { AppShell, Button, Container, Group } from '@mantine/core';
import { Link, Outlet, useLocation } from 'react-router';

export function App() {
  const { pathname } = useLocation();

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Container h="100%">
          <Group justify="space-between" h="100%">
            <Button
              component={Link}
              to="/"
              variant="transparent"
              color="teal"
              fz="xl"
              fw={700}
              pl={0}
            >
              Календарь звонков
            </Button>
            {pathname === '/' ? (
              <Button component={Link} to="/admin" variant="default">
                Администрирование
              </Button>
            ) : (
              <Button component={Link} to="/" variant="default">
                На главную
              </Button>
            )}
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main>
        <Container>
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
