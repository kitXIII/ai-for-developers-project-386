import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMeetingTypeMutation, listAdminMeetingTypesQueryKey } from '@app/api/react-query';
import { zCreateMeetingTypeRequest } from '@app/api/zod';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';

type CreateMeetingTypeModalProps = {
  opened: boolean;
  onClose: () => void;
};

type FieldName = 'name' | 'description' | 'durationMinutes';
type FieldErrors = Partial<Record<FieldName, string>>;

// One understandable message per field: the contract Zod schema decides which
// fields fail, this map decides how the failure is phrased in the UI.
const fieldMessages: Record<FieldName, string> = {
  name: 'Название обязательно: от 1 до 100 символов, без пробелов по краям',
  description: 'Описание обязательно: до 1000 символов',
  durationMinutes: 'Длительность — целое число минут от 5 до 540',
};

function collectFieldErrors(issues: { path: PropertyKey[] }[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && field in fieldMessages) {
      const fieldName = field as FieldName;
      if (!errors[fieldName]) {
        errors[fieldName] = fieldMessages[fieldName];
      }
    }
  }
  return errors;
}

export function CreateMeetingTypeModal({ opened, onClose }: CreateMeetingTypeModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Создать тип встречи">
      {/* The form mounts only while the modal is open, so each open starts clean. */}
      {opened && <CreateMeetingTypeForm onClose={onClose} />}
    </Modal>
  );
}

function CreateMeetingTypeForm({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number | string>(30);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  const createMeetingType = useMutation({
    ...createMeetingTypeMutation(),
    onSuccess: async (created) => {
      onClose();
      await queryClient.invalidateQueries({ queryKey: listAdminMeetingTypesQueryKey() });
      navigate(`/admin/meeting-types/${created.id}`);
    },
    onError: (error) => {
      setApiMessage(error.message);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = zCreateMeetingTypeRequest.safeParse({
      name,
      description,
      // An empty NumberInput comes through as '' — let the schema reject it.
      durationMinutes: typeof durationMinutes === 'number' ? durationMinutes : Number.NaN,
    });
    if (!parsed.success) {
      setFieldErrors(collectFieldErrors(parsed.error.issues));
      return;
    }
    setFieldErrors({});
    setApiMessage(null);
    createMeetingType.mutate({ body: parsed.data });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        {apiMessage && <Alert color="red">Не удалось создать тип встречи: {apiMessage}</Alert>}
        <TextInput
          label="Название"
          placeholder="Например, Созвон по проекту"
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          error={fieldErrors.name}
        />
        <Textarea
          label="Описание"
          placeholder="О чём поговорим"
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
          error={fieldErrors.description}
        />
        <NumberInput
          label="Длительность (минуты)"
          value={durationMinutes}
          onChange={setDurationMinutes}
          error={fieldErrors.durationMinutes}
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" loading={createMeetingType.isPending}>
            Создать
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
