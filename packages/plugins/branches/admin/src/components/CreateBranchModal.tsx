import * as React from 'react';

import { useAPIErrorHandler, useNotification } from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  Field,
  Flex,
  Modal,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Textarea,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { BRANCHES_PATH, BRANCH_COLOR_PALETTE, MAIN_SLUG } from '../constants';
import { useCreateBranchMutation } from '../services/branches';
import { getTranslation } from '../utils/getTranslation';
import { slugify } from '../utils/slugify';
import { BranchDot } from './BranchDot';
import { useBranches } from './useBranches';

interface CreateBranchModalProps {
  trigger: React.ReactNode;
  /** Preselected parent slug (defaults to the active branch). */
  defaultParentSlug?: string;
}

/**
 * Create-branch form: name, slug, "create from" (main or an active branch),
 * description, colour. On success the admin switches to the new branch and
 * opens its page.
 */
export const CreateBranchModal = ({ trigger, defaultParentSlug }: CreateBranchModalProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const navigate = useNavigate();
  const { branches, others, currentSlug, switchBranch } = useBranches();
  const [createBranch, { isLoading }] = useCreateBranchMutation();

  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [parentSlug, setParentSlug] = React.useState(defaultParentSlug ?? currentSlug);
  const [description, setDescription] = React.useState('');
  const [color, setColor] = React.useState(
    BRANCH_COLOR_PALETTE[others.length % BRANCH_COLOR_PALETTE.length]
  );

  const reset = () => {
    setName('');
    setSlug('');
    setSlugTouched(false);
    setParentSlug(defaultParentSlug ?? currentSlug);
    setDescription('');
  };

  const handleSubmit = async () => {
    const parent = branches.find((branch) => branch.slug === parentSlug);
    try {
      const created = await createBranch({
        name: name.trim(),
        slug: slug || undefined,
        parentId: parent && parent.slug !== MAIN_SLUG ? parent.id : null,
        description: description.trim() || undefined,
        color,
      }).unwrap();

      toggleNotification({
        type: 'success',
        message: formatMessage(
          {
            id: getTranslation('create.success'),
            defaultMessage: 'Branch {name} created. Switching to it…',
          },
          { name: created.name }
        ),
      });
      switchBranch(created.slug);
      setOpen(false);
      reset();
      navigate(`${BRANCHES_PATH}/${created.id}`);
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error as Parameters<typeof formatAPIError>[0]),
      });
    }
  };

  return (
    <Modal.Root open={open} onOpenChange={setOpen}>
      <Modal.Trigger>{trigger}</Modal.Trigger>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTranslation('create.title'),
              defaultMessage: 'Create a branch',
            })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Flex direction="column" alignItems="stretch" gap={5}>
            <Flex gap={4} alignItems="flex-start">
              <Box flex="1">
                <Field.Root name="branches-create-name" required>
                  <Field.Label>
                    {formatMessage({
                      id: getTranslation('create.name.label'),
                      defaultMessage: 'Name',
                    })}
                  </Field.Label>
                  <TextInput
                    value={name}
                    placeholder={formatMessage({
                      id: getTranslation('create.name.placeholder'),
                      defaultMessage: 'Spring release',
                    })}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      setName(event.target.value);
                      if (!slugTouched) {
                        setSlug(slugify(event.target.value));
                      }
                    }}
                  />
                </Field.Root>
              </Box>
              <Box flex="1">
                <Field.Root
                  name="branches-create-slug"
                  hint={formatMessage({
                    id: getTranslation('create.slug.hint'),
                    defaultMessage:
                      'Lowercase letters, digits and dashes — used in the X-Strapi-Branch header.',
                  })}
                >
                  <Field.Label>
                    {formatMessage({
                      id: getTranslation('create.slug.label'),
                      defaultMessage: 'Slug',
                    })}
                  </Field.Label>
                  <TextInput
                    value={slug}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      setSlugTouched(true);
                      setSlug(slugify(event.target.value));
                    }}
                  />
                  <Field.Hint />
                </Field.Root>
              </Box>
            </Flex>

            <Field.Root name="branches-create-parent">
              <Field.Label>
                {formatMessage({
                  id: getTranslation('create.parent.label'),
                  defaultMessage: 'Create from',
                })}
              </Field.Label>
              <SingleSelect value={parentSlug} onChange={(value) => setParentSlug(String(value))}>
                {branches
                  .filter((branch) => branch.status === 'active')
                  .map((branch) => (
                    <SingleSelectOption
                      key={branch.slug}
                      value={branch.slug}
                      startIcon={<BranchDot color={branch.color} />}
                    >
                      {branch.slug === MAIN_SLUG
                        ? formatMessage({
                            id: getTranslation('picker.main'),
                            defaultMessage: 'Main',
                          })
                        : branch.name}
                    </SingleSelectOption>
                  ))}
              </SingleSelect>
            </Field.Root>

            <Field.Root name="branches-create-description">
              <Field.Label>
                {formatMessage({
                  id: getTranslation('create.description.label'),
                  defaultMessage: 'Description',
                })}
              </Field.Label>
              <Textarea
                value={description}
                placeholder={formatMessage({
                  id: getTranslation('create.description.placeholder'),
                  defaultMessage: 'What is this release about?',
                })}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDescription(event.target.value)
                }
              />
            </Field.Root>

            <Field.Root name="branches-create-color">
              <Field.Label>
                {formatMessage({
                  id: getTranslation('create.color.label'),
                  defaultMessage: 'Color',
                })}
              </Field.Label>
              <Flex gap={2} paddingTop={1} wrap="wrap">
                {BRANCH_COLOR_PALETTE.map((candidate) => (
                  <Box
                    key={candidate}
                    tag="button"
                    type="button"
                    width="24px"
                    height="24px"
                    borderRadius="50%"
                    background={candidate}
                    borderColor={candidate === color ? 'neutral800' : 'neutral0'}
                    borderWidth="2px"
                    borderStyle="solid"
                    cursor="pointer"
                    aria-label={candidate}
                    aria-pressed={candidate === color}
                    onClick={() => setColor(candidate)}
                  />
                ))}
              </Flex>
            </Field.Root>
          </Flex>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary">
              {formatMessage({ id: getTranslation('create.cancel'), defaultMessage: 'Cancel' })}
            </Button>
          </Modal.Close>
          <Button onClick={handleSubmit} loading={isLoading} disabled={!name.trim() || isLoading}>
            {formatMessage({
              id: getTranslation('create.submit'),
              defaultMessage: 'Create branch',
            })}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export const BranchNameWithDot = ({ name, color }: { name: string; color: string | null }) => (
  <Flex gap={2} alignItems="center">
    <BranchDot color={color} />
    <Typography fontWeight="semiBold">{name}</Typography>
  </Flex>
);
