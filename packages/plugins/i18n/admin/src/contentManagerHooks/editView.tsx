/* eslint-disable check-file/filename-naming-convention */
import { useQueryParams } from '@strapi/admin/strapi-admin';
import { useI18nSharedFieldsLock } from '@strapi/content-manager/strapi-admin';
import { Flex, Tooltip, VisuallyHidden } from '@strapi/design-system';
import { Earth, Lock } from '@strapi/icons';
import { MessageDescriptor, useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useGetLocalesQuery } from '../services/locales';
import { getTranslation } from '../utils/getTranslation';

import type { I18nBaseQuery } from '../types';
import type { EditFieldLayout, EditLayout } from '@strapi/content-manager/strapi-admin';

interface MutateEditViewArgs {
  layout: EditLayout;
  query?: unknown;
}

type I18nLayoutOptions = EditLayout['options'] & {
  i18n?: {
    localized?: boolean;
  };
};

const hasI18nLayoutOptions = (options: EditLayout['options']): options is I18nLayoutOptions =>
  'i18n' in options && typeof options.i18n === 'object' && options.i18n !== null;

const mutateEditViewHook = ({ layout, query }: MutateEditViewArgs): MutateEditViewArgs => {
  // If i18n isn't explicitly enabled on the content type, then no field can be localized
  if (
    !('i18n' in layout.options) ||
    (typeof layout.options.i18n === 'object' &&
      layout.options.i18n !== null &&
      'localized' in layout.options.i18n &&
      !layout.options.i18n.localized)
  ) {
    return { layout, query };
  }

  // Root fields: localized → Earth; shared → Lock on secondary locales only.
  // Component fields: only Earth when explicitly localized — nested fields inherit
  // shared/locked state from their parent attribute (see #24890).
  const decorateRootField = (field: EditFieldLayout) =>
    addLabelActionToField(field, layout, { isComponentField: false });
  const decorateComponentField = (field: EditFieldLayout) =>
    addLabelActionToField(field, layout, { isComponentField: true });

  const components = Object.entries(layout.components).reduce<EditLayout['components']>(
    (acc, [key, componentLayout]) => {
      return {
        ...acc,
        [key]: {
          ...componentLayout,
          layout: componentLayout.layout.map((row) => row.map(decorateComponentField)),
        },
      };
    },
    {}
  );

  return {
    layout: {
      ...layout,
      components,
      layout: layout.layout.map((panel) => panel.map((row) => row.map(decorateRootField))),
    },
    query,
  } satisfies MutateEditViewArgs;
};

const isFieldLocalized = (attribute: EditFieldLayout['attribute'], layout: EditLayout) => {
  const contentTypeLocalized =
    hasI18nLayoutOptions(layout.options) && layout.options.i18n?.localized === true;

  if (!contentTypeLocalized) {
    return false;
  }

  // Match server `isLocalizedAttribute`: relations and uids are always locale-specific.
  if (
    attribute &&
    typeof attribute === 'object' &&
    'type' in attribute &&
    (attribute.type === 'relation' || attribute.type === 'uid')
  ) {
    return true;
  }

  const pluginOptions =
    attribute && typeof attribute === 'object' && 'pluginOptions' in (attribute as object)
      ? (attribute as { pluginOptions?: { i18n?: { localized?: boolean } } }).pluginOptions
      : undefined;

  return pluginOptions?.i18n?.localized === true;
};

const addLabelActionToField = (
  field: EditFieldLayout,
  layout: EditLayout,
  { isComponentField }: { isComponentField: boolean }
) => {
  const localized = isFieldLocalized(field.attribute, layout);

  if (localized) {
    const title: MessageDescriptor = {
      id: getTranslation('Field.localized'),
      defaultMessage: 'This value is unique for the selected locale',
    };

    return {
      ...field,
      labelAction: <LabelAction title={title} icon="earth" />,
    };
  }

  // Nested fields: no shared-field icon — parent component/DZ owns that signal (#24890).
  if (isComponentField) {
    return field;
  }

  return {
    ...field,
    labelAction: <NonLocalizedLabelAction />,
  };
};

/* -------------------------------------------------------------------------------------------------
 * LabelAction
 * -----------------------------------------------------------------------------------------------*/

interface LabelActionProps {
  title: MessageDescriptor;
  icon?: 'earth' | 'lock';
}

const LabelAction = ({ title, icon = 'earth' }: LabelActionProps) => {
  const { formatMessage } = useIntl();
  const Icon = icon === 'lock' ? Lock : Earth;

  return (
    <Span tag="span" title={title}>
      <VisuallyHidden tag="span">{formatMessage(title)}</VisuallyHidden>
      <Tooltip label={formatMessage(title)}>
        <Icon aria-hidden focusable={false} />
      </Tooltip>
    </Span>
  );
};

const NonLocalizedLabelAction = () => {
  const [{ query }] = useQueryParams<I18nBaseQuery>();
  const { data: locales = [] } = useGetLocalesQuery();
  const isUnlocked = useI18nSharedFieldsLock(
    'NonLocalizedLabelAction',
    (state) => state.isUnlocked
  );

  const currentLocale = query?.plugins?.i18n?.locale;
  const defaultLocale = Array.isArray(locales)
    ? locales.find((locale) => locale.isDefault)?.code
    : undefined;
  const locked = Boolean(currentLocale && defaultLocale && currentLocale !== defaultLocale);

  // Default locale: no icon on shared fields (regression of #24890 if we show Earth).
  if (!locked) {
    return null;
  }

  const title: MessageDescriptor = isUnlocked
    ? {
        id: getTranslation('Field.not-localized-unlocked'),
        defaultMessage: 'This value is common to all locales. Saving will update every locale.',
      }
    : {
        id: getTranslation('Field.not-localized-locked'),
        defaultMessage: 'This value is common to all locales. Edit it in the default locale.',
      };

  return <LabelAction title={title} icon="lock" />;
};

const Span = styled(Flex)`
  svg {
    width: 12px;
    height: 12px;

    fill: ${({ theme }) => theme.colors.neutral500};

    path {
      fill: ${({ theme }) => theme.colors.neutral500};
    }
  }
`;

export { mutateEditViewHook, LabelAction };
