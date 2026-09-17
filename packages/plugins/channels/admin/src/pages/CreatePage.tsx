import * as React from 'react';

import {
  Layouts,
  Page,
  useAPIErrorHandler,
  useNotification,
  useRBAC,
} from '@strapi/admin/strapi-admin';
import { Box, Button, Field, Flex, Grid, TextInput } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { CHANNEL_COLOR_PALETTE, PERMISSIONS } from '../constants';
import { useCreateChannelMutation } from '../services/channels';
import { getTranslation } from '../utils/getTranslation';
import { slugify } from '../utils/slugify';

/** Round palette swatch, ringed when selected. */
export const ColorSwatch = ({
  color,
  selected,
  onSelect,
}: {
  color: string;
  selected: boolean;
  onSelect: (color: string) => void;
}) => (
  <Box
    tag="button"
    type="button"
    aria-pressed={selected}
    aria-label={color}
    onClick={() => onSelect(color)}
    width="24px"
    height="24px"
    borderRadius="50%"
    style={{
      backgroundColor: color,
      border: selected ? '3px solid white' : 'none',
      outline: selected ? `2px solid ${color}` : 'none',
      cursor: 'pointer',
    }}
  />
);

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
  const [color, setColor] = React.useState<string>(CHANNEL_COLOR_PALETTE[0]);

  if (!canCreate) {
    return <Page.NoPermissions />;
  }

  const slug = slugify(name);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const created = await create({ name, color }).unwrap();
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
      <form onSubmit={handleSubmit}>
        <Layouts.Header
          title={formatMessage({
            id: getTranslation('create.title'),
            defaultMessage: 'Create a channel',
          })}
          navigationAction={
            <Button variant="tertiary" onClick={() => navigate('..')} size="S">
              {formatMessage({ id: 'global.back', defaultMessage: 'Back' })}
            </Button>
          }
          primaryAction={
            <Button type="submit" startIcon={<Check />} loading={isLoading} disabled={!name.trim()}>
              {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
            </Button>
          }
        />
        <Layouts.Content>
          <Grid.Root gap={4}>
            <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
              <Field.Root
                name="name"
                required
                hint={formatMessage(
                  {
                    id: getTranslation('form.name.hint'),
                    defaultMessage: 'Slug: {slug}',
                  },
                  { slug: slug || '—' }
                )}
              >
                <Field.Label>
                  {formatMessage({ id: getTranslation('form.name'), defaultMessage: 'Name' })}
                </Field.Label>
                <TextInput
                  value={name}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setName(event.target.value)
                  }
                  placeholder="Mobile"
                />
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
                      selected={candidate === color}
                      onSelect={setColor}
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

export { CreatePage };
