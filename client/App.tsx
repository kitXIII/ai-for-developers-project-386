import { Anchor, Container } from '@mantine/core';
import { Link, Outlet } from 'react-router';

export function App() {
  return (
    <>
      <header>
        <Container>
          <Anchor component={Link} to="/" fz="xl" fw={700} underline="never">
            Календарь звонков
          </Anchor>
        </Container>
      </header>
      <main>
        <Container>
          <Outlet />
        </Container>
      </main>
    </>
  );
}
