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
import { apiErrorKey } from '../../lib/api-errors';
import { useT, type MessagePath, type Translate } from '../../lib/i18n';
import {
  DESCRIPTION_MAX,
  DURATION_MAX,
  DURATION_MIN,
  SHORT_TEXT_MAX,
  SHORT_TEXT_MIN,
} from '../../lib/limits';

type CreateMeetingTypeModalProps = {
  opened: boolean;
  onClose: () => void;
};

type FieldName = 'name' | 'description' | 'durationMinutes';

// One catalog phrase per field: the contract Zod schema decides which fields
// fail, the catalog decides how the failure is worded. The limits arrive as
// `{min}`/`{max}` parameters, so the text cannot drift from the rule.
function fieldError(t: Translate, field: FieldName): string {
  switch (field) {
    case 'name':
      return t('admin.createModal.nameInvalid', { min: SHORT_TEXT_MIN, max: SHORT_TEXT_MAX });
    case 'description':
      return t('admin.createModal.descriptionInvalid', { max: DESCRIPTION_MAX });
    case 'durationMinutes':
      return t('admin.createModal.durationInvalid', { min: DURATION_MIN, max: DURATION_MAX });
  }
}

function isFieldName(value: PropertyKey): value is FieldName {
  return value === 'name' || value === 'description' || value === 'durationMinutes';
}

function collectInvalidFields(issues: { path: PropertyKey[] }[]): FieldName[] {
  const fields = new Set<FieldName>();
  for (const issue of issues) {
    const field = issue.path[0];
    if (field !== undefined && isFieldName(field)) {
      fields.add(field);
    }
  }
  return [...fields];
}

export function CreateMeetingTypeModal({ opened, onClose }: CreateMeetingTypeModalProps) {
  const t = useT();

  return (
    <Modal opened={opened} onClose={onClose} title={t('admin.createModal.title')}>
      {/* The form mounts only while the modal is open, so each open starts clean. */}
      {opened && <CreateMeetingTypeForm onClose={onClose} />}
    </Modal>
  );
}

function CreateMeetingTypeForm({ onClose }: { onClose: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number | string>(30);
  const [invalidFields, setInvalidFields] = useState<FieldName[]>([]);
  const [apiMessageKey, setApiMessageKey] = useState<MessagePath | null>(null);

  const createMeetingType = useMutation({
    ...createMeetingTypeMutation(),
    onSuccess: async (created) => {
      onClose();
      await queryClient.invalidateQueries({ queryKey: listAdminMeetingTypesQueryKey() });
      navigate(`/admin/meeting-types/${created.id}`);
    },
    onError: (error) => {
      setApiMessageKey(apiErrorKey(error));
    },
  });

  const fieldErrorText = (field: FieldName): string | undefined =>
    invalidFields.includes(field) ? fieldError(t, field) : undefined;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = zCreateMeetingTypeRequest.safeParse({
      name,
      description,
      // An empty NumberInput comes through as '' — let the schema reject it.
      durationMinutes: typeof durationMinutes === 'number' ? durationMinutes : Number.NaN,
    });
    if (!parsed.success) {
      setInvalidFields(collectInvalidFields(parsed.error.issues));
      return;
    }
    setInvalidFields([]);
    setApiMessageKey(null);
    createMeetingType.mutate({ body: parsed.data });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        {apiMessageKey && <Alert color="red">{t(apiMessageKey)}</Alert>}
        <TextInput
          label={t('admin.createModal.nameLabel')}
          placeholder={t('admin.createModal.namePlaceholder')}
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          error={fieldErrorText('name')}
        />
        <Textarea
          label={t('admin.createModal.descriptionLabel')}
          placeholder={t('admin.createModal.descriptionPlaceholder')}
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
          error={fieldErrorText('description')}
        />
        <NumberInput
          label={t('admin.createModal.durationLabel')}
          value={durationMinutes}
          onChange={setDurationMinutes}
          error={fieldErrorText('durationMinutes')}
        />
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose}>
            {t('admin.createModal.cancel')}
          </Button>
          <Button type="submit" loading={createMeetingType.isPending}>
            {t('admin.createModal.submit')}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
