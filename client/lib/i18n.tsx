import type { Messages } from '@app/api/types';
import { getMessagesOptions } from '@app/api/react-query';
import { Button, Center, Loader, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

// The client half of the catalog (ADR 0007): the tree arrives from
// GET /api/v1/messages and the contract decides its shape. The leaf-path rule
// repeats the server's `MessagePath` — the SPA cannot import server code.
type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
}[keyof T & string];

type MessagePath = Leaves<Messages>;

type MessageParams = Record<string, string | number>;

type Translate = (key: MessagePath, params?: MessageParams) => string;

const MessagesContext = createContext<Translate | null>(null);

const placeholder = /\{(\w+)\}/g;

// Resolves a dot path and fills `{name}` placeholders. A missing key or param is
// a bug in the caller, so it throws — the same contract as `t()` on the server.
function buildTranslate(messages: Messages): Translate {
  return (key, params = {}) => {
    let node: unknown = messages;
    for (const segment of key.split('.')) {
      node = (node as Record<string, unknown>)[segment];
    }
    if (typeof node !== 'string') {
      throw new Error(`Unknown message key: ${key}`);
    }
    return node.replace(placeholder, (_placeholder, name: string) => {
      const value = params[name];
      if (value === undefined) {
        throw new Error(`Missing param "${name}" for message "${key}"`);
      }
      return String(value);
    });
  };
}

// Bootstrap strings: without the catalog there is nowhere to take text from, so
// this screen is the documented exception to «every user-facing string comes
// from the catalog» (ADR 0007). The app renders only after the catalog arrives.
export function MessagesProvider({ children }: { children: ReactNode }) {
  const { data, isPending, isError, refetch } = useQuery({
    ...getMessagesOptions(),
    staleTime: Infinity,
    retry: 1,
  });

  const t = useMemo(() => (data ? buildTranslate(data.messages) : null), [data]);

  if (isPending) {
    return (
      <Center h="100vh">
        <Loader aria-label="Загрузка" />
      </Center>
    );
  }

  if (isError || !t) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="sm">
          <Text>Не удалось загрузить тексты интерфейса.</Text>
          <Button variant="default" onClick={() => void refetch()}>
            Повторить
          </Button>
        </Stack>
      </Center>
    );
  }

  return <MessagesContext.Provider value={t}>{children}</MessagesContext.Provider>;
}

export function useT(): Translate {
  const t = useContext(MessagesContext);
  if (!t) {
    throw new Error('useT() must be used inside <MessagesProvider>');
  }
  return t;
}
