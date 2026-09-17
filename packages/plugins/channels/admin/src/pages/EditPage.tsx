import * as React from 'react';

import {
  Layouts,
  Page,
  useAPIErrorHandler,
  useNotification,
  useRBAC,
} from '@strapi/admin/strapi-admin';
import { Button, Field, Flex, Grid, TextInput } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';

import { CHANNEL_COLOR_PALETTE, PERMISSIONS } from '../constants';
import { useGetChannelQuery, useUpdateChannelMutation } from '../services/channels';
import { getTranslation } from '../utils/getTranslation';

import { ColorSwatch } from './CreatePage';

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await save({ id: channel.id, name: currentName, color: currentColor });
  };

  return (
    <Page.Main tabIndex={-1}>
      <form onSubmit={handleSubmit}>
        <Layouts.Header
          title={channel.name}
          navigationAction={
            <Button variant="tertiary" onClick={() => navigate('..')} size="S">
              {formatMessage({ id: 'global.back', defaultMessage: 'Back' })}
            </Button>
          }
          primaryAction={
            canUpdate && (
              <Flex gap={2}>
                <Button
                  variant={channel.archived ? 'secondary' : 'danger-light'}
                  onClick={() => save({ id: channel.id, archived: !channel.archived })}
                  size="S"
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
                  type="submit"
                  startIcon={<Check />}
                  loading={isSaving}
                  disabled={!isModified || !currentName.trim()}
                  size="S"
                >
                  {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
                </Button>
              </Flex>
            )
          }
        />
        <Layouts.Content>
          <Grid.Root gap={4}>
            <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
              <Field.Root name="name" required>
                <Field.Label>
                  {formatMessage({ id: getTranslation('form.name'), defaultMessage: 'Name' })}
                </Field.Label>
                <TextInput
                  value={currentName}
                  disabled={!canUpdate}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setName(event.target.value)
                  }
                />
              </Field.Root>
            </Grid.Item>
            <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
              <Field.Root
                name="slug"
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
            </Grid.Item>
            <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
              <Field.Root name="color">
                <Field.Label>
                  {formatMessage({ id: getTranslation('form.color'), defaultMessage: 'Color' })}
                </Field.Label>
                <Flex gap={2} paddingTop={1}>
                  {CHANNEL_COLOR_PALETTE.map((candidate) => (
                    <ColorSwatch
                      key={candidate}
                      color={candidate}
                      selected={candidate === currentColor}
                      onSelect={(next) => canUpdate && setColor(next)}
                    />
                  ))}
                </Flex>
              </Field.Root>
            </Grid.Item>
          </Grid.Root>
        </Layouts.Content>
      </form>
    </Page.Main>
  );
};

export { EditPage };
