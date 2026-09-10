import * as React from 'react';

import {
  BackButton,
  Layouts,
  Page,
  useAPIErrorHandler,
  useNotification,
} from '@strapi/admin/strapi-admin';
import { Alert, Box, Button, Field, Flex, TextInput } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { ColorSwatchPicker, SPACE_COLOR_PALETTE } from '../components/ColorSwatchPicker';
import { useCreateSpaceMutation } from '../services/spaces';
import { getTranslation } from '../utils/getTranslation';
import { slugify } from '../utils/slugify';
import { useSpaceLimits } from '../utils/useSpaceLimits';

/**
 * Settings → Workspaces → create page (`/settings/workspaces/create`) — a full
 * page like webhooks/API tokens, reached from the switcher's "Add a workspace"
 * entry and the list's CTA. On success it lands back on the list, which now
 * shows the new workspace.
 *
 * It deliberately does NOT switch into the workspace it just created: the whole
 * Workspaces settings area is default-only (the server answers 404 for it
 * anywhere else), so switching would drop the user on an error page instead of
 * the list. Switching is the switcher's job.
 */
const CreatePage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const navigate = useNavigate();
  const [createSpace, { isLoading }] = useCreateSpaceMutation();
  const { limits, isAtLimit } = useSpaceLimits();

  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [color, setColor] = React.useState(SPACE_COLOR_PALETTE[0]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const handleSubmit = async () => {
    try {
      const created = await createSpace({
        name: name.trim(),
        slug: slug || undefined,
        color,
      }).unwrap();

      toggleNotification({
        type: 'success',
        message: formatMessage(
          {
            id: getTranslation('createModal.success'),
            defaultMessage: 'Workspace {name} created. Switch to it from the workspace menu.',
          },
          { name: created.name }
        ),
      });

      navigate('..');
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(err as Parameters<typeof formatAPIError>[0]),
      });
    }
  };

  return (
    <Page.Main tabIndex={-1}>
      <Layouts.Header
        navigationAction={<BackButton fallback=".." />}
        title={formatMessage({
          id: getTranslation('createModal.title'),
          defaultMessage: 'Create a workspace',
        })}
        primaryAction={
          <Button
            startIcon={<Check />}
            onClick={handleSubmit}
            loading={isLoading}
            disabled={!name.trim() || isLoading || isAtLimit}
          >
            {formatMessage({
              id: getTranslation('createModal.submit'),
              defaultMessage: 'Create workspace',
            })}
          </Button>
        }
      />
      <Layouts.Content>
        {isAtLimit && limits ? (
          <Box paddingBottom={4}>
            <Alert
              variant="warning"
              closeLabel=""
              onClose={() => undefined}
              title={formatMessage(
                {
                  id: getTranslation('limits.reached.title'),
                  defaultMessage: 'Workspace limit reached ({count}/{max}).',
                },
                { count: limits.count, max: limits.maxSpaces }
              )}
            >
              {formatMessage({
                id: getTranslation('limits.reached.hint'),
                defaultMessage:
                  'Your plan does not allow another workspace. Delete one, or contact your Strapi representative to raise the limit.',
              })}
            </Alert>
          </Box>
        ) : null}
        <Box background="neutral0" hasRadius shadow="filterShadow" padding={6}>
          <Flex direction="column" alignItems="stretch" gap={6}>
            <Flex gap={6} alignItems="flex-start">
              <Box flex="1">
                <Field.Root name="spaces-create-name" required>
                  <Field.Label>
                    {formatMessage({
                      id: getTranslation('createModal.name.label'),
                      defaultMessage: 'Name',
                    })}
                  </Field.Label>
                  <TextInput
                    value={name}
                    placeholder={formatMessage({
                      id: getTranslation('createModal.name.placeholder'),
                      defaultMessage: 'Acme France',
                    })}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleNameChange(e.target.value)
                    }
                  />
                </Field.Root>
              </Box>
              <Box flex="1">
                <Field.Root
                  name="spaces-create-slug"
                  hint={formatMessage({
                    id: getTranslation('createModal.slug.hint'),
                    defaultMessage:
                      'Lowercase letters, digits and dashes — used in the X-Strapi-Space-Id header and API calls.',
                  })}
                >
                  <Field.Label>
                    {formatMessage({
                      id: getTranslation('createModal.slug.label'),
                      defaultMessage: 'Slug',
                    })}
                  </Field.Label>
                  <TextInput
                    value={slug}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setSlugTouched(true);
                      setSlug(slugify(e.target.value));
                    }}
                  />
                  <Field.Hint />
                </Field.Root>
              </Box>
            </Flex>

            <Field.Root name="spaces-create-color">
              <Field.Label>
                {formatMessage({
                  id: getTranslation('createModal.color.label'),
                  defaultMessage: 'Color',
                })}
              </Field.Label>
              <Box paddingTop={1}>
                <ColorSwatchPicker value={color} onChange={setColor} />
              </Box>
            </Field.Root>
          </Flex>
        </Box>
      </Layouts.Content>
    </Page.Main>
  );
};

export { CreatePage };
