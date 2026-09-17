import * as React from 'react';

import {
  useAPIErrorHandler,
  useFetchClient,
  useForm,
  useNotification,
  useQueryParams,
} from '@strapi/admin/strapi-admin';
import { unstable_useContentManagerContext as useContentManagerContext } from '@strapi/content-manager/strapi-admin';
import {
  Button,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from '@strapi/design-system';
import { Duplicate } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { CHANNEL_HEADER } from '../constants';
import { getTranslation } from '../utils/getTranslation';

import { ChannelDot } from './ChannelDot';
import { useChannels } from './useChannels';

import type { Channel } from '../services/channels';
import type { DocumentActionComponent } from '@strapi/content-manager/strapi-admin';

type ChannelsLayoutOptions = { channels?: { enabled?: boolean; availableIn?: string[] } };

interface ChannelsAttributeOptions {
  overridable?: boolean;
  visibleIn?: string[];
}

interface FillModalProps {
  onClose: () => void;
  model: string;
  documentId: string | undefined;
  collectionType: string;
  sources: Channel[];
  targetName: string;
  attributes: string[];
  locale: string | null;
}

const FillModal = ({
  onClose,
  model,
  documentId,
  collectionType,
  sources,
  targetName,
  attributes,
  locale,
}: FillModalProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { get } = useFetchClient();
  const setValues = useForm('FillFromChannel', (state) => state.setValues);
  const values = useForm('FillFromChannel', (state) => state.values) as Record<string, unknown>;

  const [source, setSource] = React.useState<string | null>(null);
  const [isFilling, setIsFilling] = React.useState(false);

  const handleFill = async () => {
    if (!source) {
      return;
    }
    setIsFilling(true);
    try {
      const url =
        collectionType === 'single-types'
          ? `/content-manager/single-types/${model}`
          : `/content-manager/collection-types/${model}/${documentId}`;
      const { data } = await get<{ data?: Record<string, unknown> } | Record<string, unknown>>(
        url,
        {
          params: locale ? { locale } : {},
          // Explicit header — the interceptor leaves it alone.
          headers: { [CHANNEL_HEADER]: source },
        }
      );
      const body = (data ?? {}) as { data?: Record<string, unknown> };
      const doc = (body.data ?? body) as Record<string, unknown>;

      const picked: Record<string, unknown> = {};
      for (const attribute of attributes) {
        if (attribute in doc) {
          picked[attribute] = doc[attribute];
        }
      }

      setValues({ ...values, ...picked });
      toggleNotification({
        type: 'success',
        message: formatMessage(
          {
            id: getTranslation('fill.success'),
            defaultMessage:
              'Values from {source} filled in — review and save to make them {target} overrides.',
          },
          {
            source: sources.find((channel) => channel.slug === source)?.name ?? source,
            target: targetName,
          }
        ),
      });
      onClose();
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(error as Parameters<typeof formatAPIError>[0]),
      });
    } finally {
      setIsFilling(false);
    }
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Typography variant="omega" textColor="neutral600">
        {formatMessage(
          {
            id: getTranslation('fill.description'),
            defaultMessage:
              'Copy the overridable field values of another channel into this form. Nothing is saved until you save the entry on {target}.',
          },
          { target: targetName }
        )}
      </Typography>
      <Field.Root name="fill-from-channel" required>
        <Field.Label>
          {formatMessage({ id: getTranslation('fill.source'), defaultMessage: 'Source channel' })}
        </Field.Label>
        <SingleSelect
          value={source ?? undefined}
          onChange={(value) => setSource(String(value))}
          placeholder={formatMessage({
            id: getTranslation('fill.source.placeholder'),
            defaultMessage: 'Select a channel',
          })}
        >
          {sources.map((channel) => (
            <SingleSelectOption
              key={channel.slug}
              value={channel.slug}
              startIcon={<ChannelDot color={channel.color} />}
            >
              {channel.name}
            </SingleSelectOption>
          ))}
        </SingleSelect>
      </Field.Root>
      <Flex justifyContent="flex-end" gap={2}>
        <Button variant="tertiary" onClick={onClose}>
          {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
        </Button>
        <Button onClick={handleFill} loading={isFilling} disabled={!source}>
          {formatMessage({ id: getTranslation('fill.submit'), defaultMessage: 'Fill in' })}
        </Button>
      </Flex>
    </Flex>
  );
};

/**
 * "Fill from another channel" in the document's ··· menu — the channels
 * sibling of i18n's "Fill in from another locale": it fills the FORM with the
 * source channel's values for the overridable fields; saving then records
 * them as overrides of the active channel through the normal update path.
 */
export const FillFromChannelAction: DocumentActionComponent = ({
  model,
  documentId,
  collectionType,
}) => {
  const { formatMessage } = useIntl();
  const { channels, others, current, isOnDefault } = useChannels();
  const { contentType, layout } = useContentManagerContext();
  const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();
  const locale = query.plugins?.i18n?.locale ?? null;

  const layoutChannels = (layout.edit.options as ChannelsLayoutOptions).channels;
  const enabled = layoutChannels?.enabled === true;
  const availableIn = layoutChannels?.availableIn;
  const unavailable =
    Array.isArray(availableIn) && availableIn.length > 0 && !availableIn.includes(current.slug);

  if (!enabled || isOnDefault || unavailable || others.length === 0) {
    return null;
  }
  if (collectionType !== 'single-types' && !documentId) {
    return null;
  }

  // Overridable attributes, minus the ones hidden on the active channel.
  const attributes = Object.entries(contentType?.attributes ?? {}).filter(([, attribute]) => {
    const options = (attribute as { pluginOptions?: { channels?: ChannelsAttributeOptions } })
      .pluginOptions?.channels;
    if (options?.overridable !== true) {
      return false;
    }
    const { visibleIn } = options;
    return !(Array.isArray(visibleIn) && visibleIn.length > 0 && !visibleIn.includes(current.slug));
  });

  if (attributes.length === 0) {
    return null;
  }

  const sources = channels.filter((channel) => channel.slug !== current.slug);

  return {
    label: formatMessage({
      id: getTranslation('fill.label'),
      defaultMessage: 'Fill from another channel',
    }),
    icon: <Duplicate />,
    position: 'header',
    dialog: {
      type: 'modal',
      title: formatMessage({
        id: getTranslation('fill.label'),
        defaultMessage: 'Fill from another channel',
      }),
      content: ({ onClose }: { onClose: () => void }) => (
        <FillModal
          onClose={onClose}
          model={model}
          documentId={documentId}
          collectionType={collectionType}
          sources={sources}
          targetName={current.name}
          attributes={attributes.map(([name]) => name)}
          locale={locale}
        />
      ),
    },
  };
};
