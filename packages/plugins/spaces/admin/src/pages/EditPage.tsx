import * as React from 'react';

import {
  BackButton,
  Layouts,
  Page,
  useAPIErrorHandler,
  useNotification,
  useRBAC,
} from '@strapi/admin/strapi-admin';
import { Badge, Box, Button, Field, Flex, TextInput, Typography } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';

import { CapabilitiesCard } from '../components/CapabilitiesCard';
import { ColorSwatchPicker, SPACE_COLOR_PALETTE } from '../components/ColorSwatchPicker';
import { PERMISSIONS } from '../constants';
import {
  DEFAULT_CAPABILITIES,
  useGetAllSpacesQuery,
  useUpdateSpaceMutation,
  type SpaceCapabilities,
} from '../services/spaces';
import { DEFAULT_SPACE_SLUG, getCurrentSpaceSlug } from '../utils/currentSpace';
import { getTranslation } from '../utils/getTranslation';
import { slugify } from '../utils/slugify';
import { useSwitchWorkspace } from '../utils/useSwitchWorkspace';

/**
 * Settings → Workspaces → edit page (`/settings/workspaces/:id`) — a full page
 * like webhooks/API tokens, not a modal. Name, slug (locked for the default
 * workspace) and color are edited here; **archiving/restoring only lives
 * here** — you enter a workspace to archive it, never from the list.
 */
const EditPage = () => {
  const { id } = useParams<{ id: string }>();
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { data: spaces, isLoading } = useGetAllSpacesQuery();
  const [updateSpace, { isLoading: isSaving }] = useUpdateSpaceMutation();
  const switchWorkspace = useSwitchWorkspace();
  const {
    allowedActions: { canUpdate },
  } = useRBAC(PERMISSIONS);

  const space = spaces?.find((s) => s.id === Number(id)) ?? null;
  const isDefault = space?.slug === DEFAULT_SPACE_SLUG;

  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [color, setColor] = React.useState(SPACE_COLOR_PALETTE[0]);
  const [capabilities, setCapabilities] = React.useState<SpaceCapabilities>(DEFAULT_CAPABILITIES);

  React.useEffect(() => {
    if (space) {
      setName(space.name);
      setSlug(space.slug);
      setColor(space.color ?? SPACE_COLOR_PALETTE[0]);
      setCapabilities({ ...DEFAULT_CAPABILITIES, ...(space.capabilities ?? {}) });
    }
  }, [space]);

  if (isLoading) {
    return <Page.Loading />;
  }

  if (!space) {
    return <Page.Error />;
  }

  const handleSave = async () => {
    try {
      const updated = await updateSpace({
        id: space.id,
        name: name.trim(),
        color,
        ...(isDefault || slug === space.slug ? {} : { slug }),
        ...(isDefault ? {} : { capabilities }),
      }).unwrap();
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTranslation('settings.edit.success'),
          defaultMessage: 'Workspace updated.',
        }),
      });
      if (space.slug === getCurrentSpaceSlug() && updated.slug !== space.slug) {
        // Renamed the workspace we're in: re-point the stored selection and
        // rescope the caches (the header value just changed).
        switchWorkspace(updated.slug);
      }
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(err as Parameters<typeof formatAPIError>[0]),
      });
    }
  };

  const handleToggleStatus = async () => {
    try {
      await updateSpace({
        id: space.id,
        status: space.status === 'active' ? 'archived' : 'active',
      }).unwrap();
      toggleNotification({
        type: 'success',
        message: formatMessage(
          {
            id: getTranslation(
              space.status === 'active' ? 'settings.archived.success' : 'settings.restored.success'
            ),
            defaultMessage: space.status === 'active' ? '{name} archived.' : '{name} restored.',
          },
          { name: space.name }
        ),
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
        title={space.name}
        subtitle={space.slug}
        primaryAction={
          canUpdate && (
            <Flex gap={2}>
              <Button variant="tertiary" onClick={handleToggleStatus} disabled={isSaving}>
                {formatMessage({
                  id: getTranslation(
                    space.status === 'active' ? 'settings.archive' : 'settings.restore'
                  ),
                  defaultMessage: space.status === 'active' ? 'Archive' : 'Restore',
                })}
              </Button>
              <Button
                startIcon={<Check />}
                onClick={handleSave}
                loading={isSaving}
                disabled={!name.trim() || isSaving}
              >
                {formatMessage({
                  id: getTranslation('settings.edit.submit'),
                  defaultMessage: 'Save',
                })}
              </Button>
            </Flex>
          )
        }
      />
      <Layouts.Content>
        <Box background="neutral0" hasRadius shadow="filterShadow" padding={6}>
          <Flex direction="column" alignItems="stretch" gap={6}>
            <Flex justifyContent="space-between">
              <Typography variant="delta" tag="h2">
                {formatMessage({
                  id: getTranslation('settings.edit.details'),
                  defaultMessage: 'Details',
                })}
              </Typography>
              <Badge
                active={space.status === 'active'}
                textColor={space.status === 'active' ? 'success600' : 'neutral600'}
              >
                {formatMessage({
                  id: getTranslation(`settings.status.${space.status}`),
                  defaultMessage: space.status === 'active' ? 'Active' : 'Archived',
                })}
              </Badge>
            </Flex>

            <Flex gap={6} alignItems="flex-start">
              <Box flex="1">
                <Field.Root name="spaces-edit-name" required>
                  <Field.Label>
                    {formatMessage({
                      id: getTranslation('createModal.name.label'),
                      defaultMessage: 'Name',
                    })}
                  </Field.Label>
                  <TextInput
                    value={name}
                    disabled={!canUpdate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  />
                </Field.Root>
              </Box>
              <Box flex="1">
                <Field.Root
                  name="spaces-edit-slug"
                  hint={formatMessage({
                    id: getTranslation(
                      isDefault ? 'settings.edit.slug.locked' : 'settings.edit.slug.hint'
                    ),
                    defaultMessage: isDefault
                      ? 'The default workspace slug is locked — it is the system fallback.'
                      : 'Changing the slug updates the X-Strapi-Space-Id identifier — external API consumers must follow.',
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
                    disabled={isDefault || !canUpdate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSlug(slugify(e.target.value))
                    }
                  />
                  <Field.Hint />
                </Field.Root>
              </Box>
            </Flex>

            <Field.Root name="spaces-edit-color">
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

        {/* The default workspace always sees everything — nothing to configure. */}
        {!isDefault && (
          <Box paddingTop={6}>
            <CapabilitiesCard
              value={capabilities}
              onChange={setCapabilities}
              disabled={!canUpdate}
            />
          </Box>
        )}
      </Layouts.Content>
    </Page.Main>
  );
};

export { EditPage };
