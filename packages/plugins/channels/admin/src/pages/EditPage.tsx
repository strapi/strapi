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
import { useNavigate, useParams } from 'react-router-dom';

import { ColorSwatchPicker } from '../components/ColorSwatchPicker';
import { CHANNEL_COLOR_PALETTE, PERMISSIONS } from '../constants';
import { useGetChannelQuery, useUpdateChannelMutation } from '../services/channels';
import { getTranslation } from '../utils/getTranslation';

const EditPage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const channelId = Number(id);
  const { data: channel, isLoading } = useGetChannelQuery(channelId, {
    skip: !Number.isInteger(channelId),
  });
  const [update, { isLoading: isSaving }] = useUpdateChannelMutation();
  const {
    allowedActions: { canUpdate },
  } = useRBAC(PERMISSIONS);

  const [name, setName] = React.useState<string | null>(null);
  const [color, setColor] = React.useState<string | null>(null);

  if (isLoading) {
    return <Page.Loading />;
  }
  if (!channel) {
    return <Page.Error />;
  }

  const currentName = name ?? channel.name;
  const currentColor = color ?? channel.color ?? CHANNEL_COLOR_PALETTE[0];
  const isModified = currentName !== channel.name || currentColor !== (channel.color ?? '');

  const save = async (data: Parameters<typeof update>[0]) => {
    try {
      await update(data).unwrap();
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTranslation('settings.updated.success'),
          defaultMessage: 'Channel updated.',
        }),
      });
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
        title={channel.name}
        primaryAction={
          canUpdate && (
            <Flex gap={2}>
              {!channel.isDefault && !channel.archived ? (
                <Button
                  variant="secondary"
                  onClick={() => save({ id: channel.id, isDefault: true })}
                >
                  {formatMessage({
                    id: getTranslation('settings.set-default'),
                    defaultMessage: 'Set as default',
                  })}
                </Button>
              ) : null}
              <Button
                variant={channel.archived ? 'secondary' : 'danger-light'}
                disabled={channel.isDefault}
                onClick={() => save({ id: channel.id, archived: !channel.archived })}
              >
                {channel.archived
                  ? formatMessage({
                      id: getTranslation('settings.restore'),
                      defaultMessage: 'Restore',
                    })
                  : formatMessage({
                      id: getTranslation('settings.archive'),
                      defaultMessage: 'Archive',
                    })}
              </Button>
              <Button
                startIcon={<Check />}
                onClick={() => save({ id: channel.id, name: currentName, color: currentColor })}
                loading={isSaving}
                disabled={!isModified || !currentName.trim()}
              >
                {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
              </Button>
            </Flex>
          )
        }
      />
      <Layouts.Content>
        <Box background="neutral0" hasRadius shadow="filterShadow" padding={6}>
          <Flex direction="column" alignItems="stretch" gap={6}>
            <Flex gap={6} alignItems="flex-start">
              <Box flex="1">
                <Field.Root name="channels-edit-name" required>
                  <Field.Label>
                    {formatMessage({ id: getTranslation('form.name'), defaultMessage: 'Name' })}
                  </Field.Label>
                  <TextInput
                    value={currentName}
                    disabled={!canUpdate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  />
                </Field.Root>
              </Box>
              <Box flex="1">
                <Field.Root
                  name="channels-edit-slug"
                  hint={formatMessage({
                    id: getTranslation('form.slug.hint'),
                    defaultMessage: 'Slugs are immutable — API consumers rely on them.',
                  })}
                >
                  <Field.Label>
                    {formatMessage({ id: getTranslation('form.slug'), defaultMessage: 'Slug' })}
                  </Field.Label>
                  <TextInput value={channel.slug} disabled />
                  <Field.Hint />
                </Field.Root>
              </Box>
            </Flex>

            <Field.Root name="channels-edit-color">
              <Field.Label>
                {formatMessage({ id: getTranslation('form.color'), defaultMessage: 'Color' })}
              </Field.Label>
              <Box paddingTop={1}>
                <ColorSwatchPicker value={currentColor} onChange={setColor} disabled={!canUpdate} />
              </Box>
            </Field.Root>
          </Flex>
        </Box>
      </Layouts.Content>
    </Page.Main>
  );
};

export { EditPage };
