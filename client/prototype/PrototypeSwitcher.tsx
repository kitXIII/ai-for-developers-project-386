// ПРОТОТИП: плавающий переключатель вариантов (?variant=), стрелки и клавиши ←/→.
import { ActionIcon, Group, Paper, Text } from '@mantine/core';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

export const VARIANTS = ['A', 'B', 'C'] as const;
export type VariantKey = (typeof VARIANTS)[number];

export const VARIANT_NAMES: Record<VariantKey, { guest: string; admin: string }> = {
  A: { guest: 'Пошаговый мастер', admin: 'Таблицы' },
  B: { guest: 'Всё на одном экране', admin: 'Вкладки и карточки' },
  C: { guest: 'Список дней', admin: 'Мастер-деталь' },
};

export function useVariant(): [VariantKey, (v: VariantKey) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('variant') ?? 'A';
  const current = (VARIANTS as readonly string[]).includes(raw) ? (raw as VariantKey) : 'A';
  const set = (v: VariantKey) => setParams({ variant: v }, { replace: true });
  return [current, set];
}

export function PrototypeSwitcher() {
  const [current, set] = useVariant();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const delta = event.key === 'ArrowRight' ? 1 : -1;
        const index = VARIANTS.indexOf(current);
        set(VARIANTS[(index + delta + VARIANTS.length) % VARIANTS.length]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, set]);

  return (
    <Paper
      shadow="md"
      radius="xl"
      p="xs"
      withBorder
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        background: 'var(--mantine-color-body)',
      }}
    >
      <Group gap="sm" wrap="nowrap">
        <ActionIcon
          variant="filled"
          radius="xl"
          onClick={() =>
            set(VARIANTS[(VARIANTS.indexOf(current) + VARIANTS.length - 1) % VARIANTS.length])
          }
          aria-label="Предыдущий вариант"
        >
          ←
        </ActionIcon>
        <Text fw={700} fz="sm" style={{ whiteSpace: 'nowrap' }}>
          {current} — {VARIANT_NAMES[current].guest} / {VARIANT_NAMES[current].admin}
        </Text>
        <ActionIcon
          variant="filled"
          radius="xl"
          onClick={() => set(VARIANTS[(VARIANTS.indexOf(current) + 1) % VARIANTS.length])}
          aria-label="Следующий вариант"
        >
          →
        </ActionIcon>
      </Group>
    </Paper>
  );
}
