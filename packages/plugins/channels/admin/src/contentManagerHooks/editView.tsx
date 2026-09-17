/* eslint-disable check-file/filename-naming-convention */
import { DEFAULT_CHANNEL_SLUG } from '../constants';
import { getCurrentChannelSlug } from '../utils/currentChannel';
import { ChannelFieldLabelAction, SameOnAllChannels } from '../components/ChannelFieldLabelAction';

import type { EditFieldLayout, EditLayout } from '@strapi/content-manager/strapi-admin';

interface MutateEditViewArgs {
  layout: EditLayout;
  [key: string]: unknown;
}

type ChannelsLayoutOptions = EditLayout['options'] & {
  channels?: { enabled?: boolean };
};

interface ChannelsAttributeOptions {
  overridable?: boolean;
  visibleIn?: string[];
}

const attributeOptions = (attribute: EditFieldLayout['attribute']): ChannelsAttributeOptions => {
  const pluginOptions =
    attribute && typeof attribute === 'object' && 'pluginOptions' in (attribute as object)
      ? (attribute as { pluginOptions?: { channels?: ChannelsAttributeOptions } }).pluginOptions
      : undefined;
  return pluginOptions?.channels ?? {};
};

/**
 * Decorates the edit-view layout for the active channel (registered on the
 * `Admin/CM/pages/EditView/mutate-edit-view-layout` waterfall). It re-runs on
 * every channel switch because the core waterfall's memo depends on the
 * document render-context key this plugin registers in `index.ts`.
 *
 *   - attribute hidden on this channel (`visibleIn` excludes it) → not rendered;
 *   - non-overridable attribute on a channel → disabled, "same everywhere" badge;
 *   - overridable attribute → live badge (override state, per-field reset).
 *
 * Top-level attributes only: a component or dynamic zone overrides atomically
 * and its `disabled` state cascades into its inputs.
 */
const mutateEditViewHook = ({ layout, ...rest }: MutateEditViewArgs): MutateEditViewArgs => {
  if ((layout.options as ChannelsLayoutOptions).channels?.enabled !== true) {
    return { layout, ...rest };
  }

  const slug = getCurrentChannelSlug();
  const onChannel = slug !== DEFAULT_CHANNEL_SLUG;

  const decorateField = (field: EditFieldLayout): EditFieldLayout => {
    const { overridable, visibleIn } = attributeOptions(field.attribute);

    if (
      onChannel &&
      Array.isArray(visibleIn) &&
      visibleIn.length > 0 &&
      !visibleIn.includes(slug)
    ) {
      return { ...field, visible: false };
    }

    if (overridable !== true) {
      return onChannel ? { ...field, disabled: true, labelAction: <SameOnAllChannels /> } : field;
    }

    return { ...field, labelAction: <ChannelFieldLabelAction fieldName={field.name} /> };
  };

  return {
    ...rest,
    layout: {
      ...layout,
      layout: layout.layout.map((panel) => panel.map((row) => row.map(decorateField))),
    },
  };
};

export { mutateEditViewHook };
