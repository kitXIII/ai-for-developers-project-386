import { AppShell, Burger, Button, Container, Group, NavLink } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link, Outlet, useLocation } from 'react-router';
import { useT } from './lib/i18n';

export function App() {
  const t = useT();
  const { pathname } = useLocation();
  const [menuOpened, { toggle: toggleMenu, close: closeMenu }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { desktop: true, mobile: !menuOpened } }}
      padding="md"
    >
      <AppShell.Header>
        <Container h="100%">
          <Group justify="space-between" h="100%">
            <Button component={Link} to="/" variant="transparent" fz="xl" fw={700} pl={0}>
              {t('common.appName')}
            </Button>
            <Group gap="sm">
              {pathname === '/' ? (
                <Button component={Link} to="/admin" variant="default" visibleFrom="sm">
                  {t('common.nav.admin')}
                </Button>
              ) : (
                <Button component={Link} to="/" variant="default" visibleFrom="sm">
                  {t('common.nav.home')}
                </Button>
              )}
              <Burger
                opened={menuOpened}
                onClick={toggleMenu}
                hiddenFrom="sm"
                size="sm"
                aria-label={t('common.aria.toggleMenu')}
              />
            </Group>
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <NavLink
          component={Link}
          to="/"
          label={t('common.nav.home')}
          active={pathname === '/'}
          onClick={closeMenu}
        />
        <NavLink
          component={Link}
          to="/admin"
          label={t('common.nav.admin')}
          active={pathname === '/admin'}
          onClick={closeMenu}
        />
      </AppShell.Navbar>
      <AppShell.Main>
        <Container>
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
