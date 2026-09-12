import * as React from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';
import {
  Button,
  Checkbox,
  Field,
  Flex,
  Modal,
  Textarea,
  TextInput,
  Toggle,
  Typography,
} from '@strapi/design-system';
import { useIntl, type IntlShape } from 'react-intl';

import {
  useCreateSpaceMutation,
  useGetSpacesSettingsQuery,
  useUpdateSpaceMutation,
  type Space,
} from '../services/api';
import { formatApiError } from '../utils/formatApiError';
import { getTranslation } from '../utils/getTranslation';

interface SpaceModalProps {
  /** `null` when creating. */
  space: Space | null;
  onClose: () => void;
}

const SpaceModal = ({ space, onClose }: SpaceModalProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { data: settings } = useGetSpacesSettingsQuery();

  const [createSpace, { isLoading: isCreating }] = useCreateSpaceMutation();
  const [updateSpace, { isLoading: isUpdating }] = useUpdateSpaceMutation();

  const [name, setName] = React.useState(space?.name ?? '');
  const [slug, setSlug] = React.useState(space?.slug ?? '');
  const [description, setDescription] = React.useState(space?.description ?? '');
  const [archived, setArchived] = React.useState(space?.status === 'archived');

  /**
   * `null` means every content type, which is both the default and a different
   * thing from "all of them ticked" — a space set to all keeps content types
   * added later, a space with an explicit list does not.
   */
  const [restricted, setRestricted] = React.useState(
    space?.contentTypes !== null && space?.contentTypes !== undefined
  );
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>(space?.contentTypes ?? []);

  const isEditing = space !== null;
  const isSubmitting = isCreating || isUpdating;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const contentTypes = restricted ? selectedTypes : null;

    const result = isEditing
      ? await updateSpace({
          id: space.id,
          data: {
            name,
            description,
            contentTypes,
            status: archived ? 'archived' : 'active',
          },
        })
      : await createSpace({ name, slug: slug || undefined, description, contentTypes });

    if ('error' in result) {
      toggleNotification({ type: 'danger', message: formatApiError(result.error) });

      return;
    }

    toggleNotification({
      type: 'success',
      message: formatMessage(
        isEditing
          ? { id: getTranslation('modal.updated'), defaultMessage: 'Space updated.' }
          : { id: getTranslation('modal.created'), defaultMessage: 'Space created.' }
      ),
    });

    onClose();
  };

  const toggleType = (uid: string) => {
    setSelectedTypes((current) =>
      current.includes(uid) ? current.filter((entry) => entry !== uid) : [...current, uid]
    );
  };

  return (
    <Modal.Root open onOpenChange={onClose}>
      <Modal.Content>
        <form onSubmit={handleSubmit}>
          <Modal.Header>
            <Modal.Title>
              {formatMessage(
                isEditing
                  ? { id: getTranslation('modal.edit.title'), defaultMessage: 'Edit space' }
                  : { id: getTranslation('modal.create.title'), defaultMessage: 'Create a space' }
              )}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Field.Root name="name" required>
                <Field.Label>
                  {formatMessage({ id: getTranslation('modal.name'), defaultMessage: 'Name' })}
                </Field.Label>
                <TextInput
                  value={name}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setName(event.target.value)
                  }
                  required
                />
              </Field.Root>

              <Field.Root name="slug" hint={slugHint(formatMessage, isEditing)}>
                <Field.Label>
                  {formatMessage({ id: getTranslation('modal.slug'), defaultMessage: 'Slug' })}
                </Field.Label>
                <TextInput
                  value={slug}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setSlug(event.target.value)
                  }
                  disabled={isEditing}
                  placeholder={formatMessage({
                    id: getTranslation('modal.slug.placeholder'),
                    defaultMessage: 'Generated from the name',
                  })}
                />
                <Field.Hint />
              </Field.Root>

              <Field.Root name="description">
                <Field.Label>
                  {formatMessage({
                    id: getTranslation('modal.description'),
                    defaultMessage: 'Description',
                  })}
                </Field.Label>
                <Textarea
                  value={description ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setDescription(event.target.value)
                  }
                />
              </Field.Root>

              <Field.Root name="restricted">
                <Checkbox
                  checked={restricted}
                  onCheckedChange={(checked: boolean) => setRestricted(Boolean(checked))}
                >
                  {formatMessage({
                    id: getTranslation('modal.restrict'),
                    defaultMessage: 'Limit this space to some content types',
                  })}
                </Checkbox>
              </Field.Root>

              {restricted ? (
                <Flex direction="column" alignItems="stretch" gap={2} paddingLeft={4}>
                  {(settings?.contentTypes ?? []).map((contentType) => (
                    <Checkbox
                      key={contentType.uid}
                      checked={selectedTypes.includes(contentType.uid)}
                      onCheckedChange={() => toggleType(contentType.uid)}
                    >
                      {contentType.displayName}
                    </Checkbox>
                  ))}
                  {settings?.contentTypes.length === 0 ? (
                    <Typography variant="pi" textColor="neutral600">
                      {formatMessage({
                        id: getTranslation('modal.restrict.empty'),
                        defaultMessage: 'This project has no content types yet.',
                      })}
                    </Typography>
                  ) : null}
                </Flex>
              ) : null}

              {isEditing && !space.isDefault ? (
                <Field.Root
                  name="archived"
                  hint={formatMessage({
                    id: getTranslation('modal.archived.hint'),
                    defaultMessage:
                      'An archived space keeps its content but nobody can work in it.',
                  })}
                >
                  <Field.Label>
                    {formatMessage({
                      id: getTranslation('modal.archived'),
                      defaultMessage: 'Archived',
                    })}
                  </Field.Label>
                  <Toggle
                    checked={archived}
                    onLabel="On"
                    offLabel="Off"
                    onChange={() => setArchived((value) => !value)}
                  />
                  <Field.Hint />
                </Field.Root>
              ) : null}
            </Flex>
          </Modal.Body>

          <Modal.Footer>
            <Modal.Close>
              <Button variant="tertiary">
                {formatMessage({ id: getTranslation('modal.cancel'), defaultMessage: 'Cancel' })}
              </Button>
            </Modal.Close>
            <Button type="submit" loading={isSubmitting}>
              {formatMessage({ id: getTranslation('modal.save'), defaultMessage: 'Save' })}
            </Button>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
};

const slugHint = (formatMessage: IntlShape['formatMessage'], isEditing: boolean) =>
  isEditing
    ? formatMessage({
        id: getTranslation('modal.slug.locked'),
        defaultMessage:
          'The slug cannot change: API tokens and saved links refer to a space by it.',
      })
    : formatMessage({
        id: getTranslation('modal.slug.hint'),
        defaultMessage: 'Lowercase letters, digits and dashes. Cannot be changed afterwards.',
      });

export { SpaceModal };
