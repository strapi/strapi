import * as React from 'react';

import {
  BackButton,
  Layouts,
  Page,
  useAPIErrorHandler,
  useNotification,
  useRBAC,
} from '@strapi/admin/strapi-admin';
import { Box, Button, Field, Flex, TextInput } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { ColorSwatchPicker } from '../components/ColorSwatchPicker';
import { CHANNEL_COLOR_PALETTE, PERMISSIONS } from '../constants';
import { useCreateChannelMutation } from '../services/channels';
import { getTranslation } from '../utils/getTranslation';
import { slugify } from '../utils/slugify';

/**
 * Settings → Channels → create page (`/settings/channels/create`) — a full
 * page like webhooks/API tokens. On success it lands back on the list.
 */
const CreatePage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const navigate = useNavigate();
  const [create, { isLoading }] = useCreateChannelMutation();
  const {
    allowedActions: { canCreate },
  } = useRBAC(PERMISSIONS);

  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [color, setColor] = React.useState(CHANNEL_COLOR_PALETTE[0]);

  if (!canCreate) {
    return <Page.NoPermissions />;
  }

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const handleSubmit = async () => {
    try {
      const created = await create({ name: name.trim(), slug: slug || undefined, color }).unwrap();
      toggleNotification({
        type: 'success',
        message: formatMessage(
          { id: getTranslation('settings.created.success'), defaultMessage: '{name} created.' },
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
          id: getTranslation('create.title'),
          defaultMessage: 'Create a channel',
        })}
        primaryAction={
          <Button
            startIcon={<Check />}
            onClick={handleSubmit}
            loading={isLoading}
            disabled={!name.trim() || isLoading}
          >
            {formatMessage({
              id: getTranslation('settings.create.submit'),
              defaultMessage: 'Create channel',
            })}
          </Button>
        }
      />
      <Layouts.Content>
        <Box background="neutral0" hasRadius shadow="filterShadow" padding={6}>
          <Flex direction="column" alignItems="stretch" gap={6}>
            <Flex gap={6} alignItems="flex-start">
              <Box flex="1">
                <Field.Root name="channels-create-name" required>
                  <Field.Label>
                    {formatMessage({ id: getTranslation('form.name'), defaultMessage: 'Name' })}
                  </Field.Label>
                  <TextInput
                    value={name}
                    placeholder={formatMessage({
                      id: getTranslation('form.name.placeholder'),
                      defaultMessage: 'Mobile',
                    })}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleNameChange(e.target.value)
                    }
                  />
                </Field.Root>
              </Box>
              <Box flex="1">
                <Field.Root
                  name="channels-create-slug"
                  hint={formatMessage({
                    id: getTranslation('form.slug.create.hint'),
                    defaultMessage:
                      'Lowercase letters, digits and dashes — used in the X-Strapi-Channel header and API calls. Immutable once created.',
                  })}
                >
                  <Field.Label>
                    {formatMessage({ id: getTranslation('form.slug'), defaultMessage: 'Slug' })}
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

            <Field.Root name="channels-create-color">
              <Field.Label>
                {formatMessage({ id: getTranslation('form.color'), defaultMessage: 'Color' })}
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
