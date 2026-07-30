import * as React from 'react';

import {
  BackButton,
  Layouts,
  Page,
  useAPIErrorHandler,
  useNotification,
} from '@strapi/admin/strapi-admin';
import { Box, Button, Field, Flex, TextInput } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { CapabilitiesCard } from '../components/CapabilitiesCard';
import { ColorSwatchPicker, SPACE_COLOR_PALETTE } from '../components/ColorSwatchPicker';
import {
  DEFAULT_CAPABILITIES,
  useCreateSpaceMutation,
  type SpaceCapabilities,
} from '../services/spaces';
import { getTranslation } from '../utils/getTranslation';
import { slugify } from '../utils/slugify';
import { useSwitchWorkspace } from '../utils/useSwitchWorkspace';

/**
 * Settings → Workspaces → create page (`/settings/workspaces/create`) — a full
 * page like webhooks/API tokens, reached from the switcher's "Add a workspace"
 * entry and the list's CTA. On success the admin switches to the new workspace
 * (pure data swap, no reload) and lands back on the list.
 */
const CreatePage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const navigate = useNavigate();
  const switchWorkspace = useSwitchWorkspace();
  const [createSpace, { isLoading }] = useCreateSpaceMutation();

  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [color, setColor] = React.useState(SPACE_COLOR_PALETTE[0]);
  const [capabilities, setCapabilities] = React.useState<SpaceCapabilities>(DEFAULT_CAPABILITIES);

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
        capabilities,
      }).unwrap();

      toggleNotification({
        type: 'success',
        message: formatMessage(
          {
            id: getTranslation('createModal.success'),
            defaultMessage: 'Workspace {name} created. Switching to it…',
          },
          { name: created.name }
        ),
      });

      switchWorkspace(created.slug);
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
            disabled={!name.trim() || isLoading}
          >
            {formatMessage({
              id: getTranslation('createModal.submit'),
              defaultMessage: 'Create workspace',
            })}
          </Button>
        }
      />
      <Layouts.Content>
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

        <Box paddingTop={6}>
          <CapabilitiesCard value={capabilities} onChange={setCapabilities} />
        </Box>
      </Layouts.Content>
    </Page.Main>
  );
};

export { CreatePage };
