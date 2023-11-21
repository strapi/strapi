/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { Flex, Tooltip, VisuallyHidden } from '@strapi/design-system';
import { Earth, EarthStriked } from '@strapi/icons';
import { MessageDescriptor, useIntl } from 'react-intl';
import styled from 'styled-components';

import { doesPluginOptionsHaveI18nLocalized } from '../utils/fields';
import { getTranslation } from '../utils/getTranslation';

import type {
  CMAdminConfiguration,
  I18nBaseQuery,
  NonRelationLayout,
  RelationLayout,
} from '../types';

/* -------------------------------------------------------------------------------------------------
 * mutateEditViewLayoutHook
 * -----------------------------------------------------------------------------------------------*/

interface MutateEditViewLayoutHookArgs {
  layout: {
    components: Record<string, CMAdminConfiguration>;
    contentType: CMAdminConfiguration;
  };
  query?: I18nBaseQuery;
}

const mutateEditViewLayoutHook = ({ layout, query }: MutateEditViewLayoutHookArgs) => {
  const { contentType, components } = layout;
  const hasI18nEnabled = doesPluginOptionsHaveI18nLocalized(contentType.pluginOptions)
    ? contentType.pluginOptions.i18n.localized
    : false;

  if (!hasI18nEnabled) {
    return { layout, query };
  }

  const currentLocale = query?.plugins?.i18n?.locale ?? null;

  // This might break the cm, has the user might be redirected to the homepage
  if (!currentLocale) {
    return { layout, query };
  }

  return {
    query,
    layout: {
      ...layout,
      contentType: {
        ...layout.contentType,
        layouts: {
          ...contentType.layouts,
          edit: enhanceEditLayout(contentType.layouts.edit, currentLocale),
        },
      },
      components: enhanceComponentsLayout(components, currentLocale),
    },
  };
};

/* -------------------------------------------------------------------------------------------------
 * enhanceEditLayout
 * -----------------------------------------------------------------------------------------------*/

const enhanceEditLayout = (
  layout: CMAdminConfiguration['layouts']['edit'],
  currentLocale: string
) =>
  layout.map((row) =>
    row.map((field) => {
      const type = field?.fieldSchema?.type ?? null;
      // uid and relation fields are always localized
      const hasI18nEnabled = isFieldLocalized(field) ?? ['uid', 'relation'].includes(type);

      const labelActionProps = {
        title: {
          id: hasI18nEnabled
            ? getTranslation('Field.localized')
            : getTranslation('Field.not-localized'),
          defaultMessage: hasI18nEnabled
            ? 'This value is unique for the selected locale'
            : 'This value is common to all locales',
        },
        icon: hasI18nEnabled ? <Earth /> : <EarthStriked />,
      };

      const labelAction = <LabelAction {...labelActionProps} />;

      if (isFieldRelation(field) && isFieldLocalized(field)) {
        return {
          ...field,
          labelAction,
          queryInfos: {
            ...field.queryInfos,
            defaultParams: { ...field.queryInfos.defaultParams, locale: currentLocale },
            paramsToKeep: ['plugins.i18n.locale'],
          },
        };
      }

      return { ...field, labelAction };
    }, [])
  );

const isFieldRelation = (field: RelationLayout | NonRelationLayout): field is RelationLayout =>
  field.fieldSchema.type === 'relation';

const isFieldLocalized = (field: RelationLayout | NonRelationLayout): boolean => {
  if (isFieldRelation(field)) {
    return doesPluginOptionsHaveI18nLocalized(field.targetModelPluginOptions)
      ? field.targetModelPluginOptions.i18n.localized
      : false;
  } else {
    return doesPluginOptionsHaveI18nLocalized(field.fieldSchema.pluginOptions)
      ? field.fieldSchema.pluginOptions.i18n.localized
      : false;
  }
};

/* -------------------------------------------------------------------------------------------------
 * enhanceComponentsLayout
 * -----------------------------------------------------------------------------------------------*/

const enhanceComponentsLayout = (
  components: Record<string, CMAdminConfiguration>,
  locale: string
) => {
  return Object.keys(components).reduce<Record<string, CMAdminConfiguration>>((acc, current) => {
    const currentComponentLayout = components[current];

    const enhancedEditLayout = enhanceComponentLayoutForRelations(
      currentComponentLayout.layouts.edit,
      locale
    );

    acc[current] = {
      ...currentComponentLayout,
      layouts: { ...currentComponentLayout.layouts, edit: enhancedEditLayout },
    };

    return acc;
  }, {});
};

const enhanceComponentLayoutForRelations = (
  layout: CMAdminConfiguration['layouts']['edit'],
  locale: string
) =>
  layout.map((row) =>
    row.map((field) => {
      if (isFieldRelation(field) && isFieldLocalized(field)) {
        return {
          ...field,
          queryInfos: {
            ...field.queryInfos,
            defaultParams: { ...field.queryInfos.defaultParams, locale },
            paramsToKeep: ['plugins.i18n.locale'],
          },
        };
      }
      return field;
    })
  );

/* -------------------------------------------------------------------------------------------------
 * LabelAction
 * -----------------------------------------------------------------------------------------------*/

interface LabelActionProps {
  title: MessageDescriptor;
  icon: React.ReactNode;
}

const LabelAction = ({ title, icon }: LabelActionProps) => {
  const { formatMessage } = useIntl();

  return (
    <Tooltip description={formatMessage(title)}>
      <Span as="span">
        <VisuallyHidden as="span">{`(${formatMessage(title)})`}</VisuallyHidden>
        {React.cloneElement(icon as React.ReactElement, {
          'aria-hidden': true,
          focusable: false, // See: https://allyjs.io/tutorials/focusing-in-svg.html#making-svg-elements-focusable
        })}
      </Span>
    </Tooltip>
  );
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

export { mutateEditViewLayoutHook };
