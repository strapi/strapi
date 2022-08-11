import React from 'react';
import get from 'lodash/get';
import I18N from '@strapi/icons/Earth';
import StrikedWorld from '@strapi/icons/EarthStriked';
import LabelAction from '../components/LabelAction';
import { getTrad } from '../utils';

const enhanceEditLayout = (layout) =>
  layout.map((row) => {
    const enhancedRow = row.reduce((acc, field) => {
      const type = get(field, ['fieldSchema', 'type'], null);
      const hasI18nEnabled = get(
        field,
        ['fieldSchema', 'pluginOptions', 'i18n', 'localized'],
        type === 'uid'
      );

      const labelActionProps = {
        title: {
          id: hasI18nEnabled ? getTrad('Field.localized') : getTrad('Field.not-localized'),
          defaultMessage: hasI18nEnabled
            ? 'This value is unique for the selected locale'
            : 'This value is common to all locales',
        },
        icon: hasI18nEnabled ? <I18N aria-hidden /> : <StrikedWorld aria-hidden />,
      };

      acc.push({ ...field, labelAction: <LabelAction {...labelActionProps} /> });

      return acc;
    }, []);

    return enhancedRow;
  });

const enhanceComponentsLayout = (components, locale) => {
  return Object.keys(components).reduce((acc, current) => {
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

const enhanceComponentLayoutForRelations = (layout, locale) =>
  layout.map((row) => {
    const enhancedRow = row.reduce((acc, field) => {
      if (
        get(field, ['fieldSchema', 'type']) === 'relation' &&
        get(field, ['targetModelPluginOptions', 'i18n', 'localized'], false)
      ) {
        const queryInfos = {
          ...field.queryInfos,
          defaultParams: { ...field.queryInfos.defaultParams, locale },
          paramsToKeep: ['plugins.i18n.locale'],
        };

        acc.push({ ...field, queryInfos });

        return acc;
      }

      acc.push({ ...field });

      return acc;
    }, []);

    return enhancedRow;
  });

const getPathToContentType = (pathArray) => ['contentType', ...pathArray];

const mutateEditViewLayoutHook = ({ layout, query }) => {
  const hasI18nEnabled = get(
    layout,
    getPathToContentType(['pluginOptions', 'i18n', 'localized']),
    false
  );

  if (!hasI18nEnabled) {
    return { layout, query };
  }

  const currentLocale = get(query, ['plugins', 'i18n', 'locale'], null);

  // This might break the cm, has the user might be redirected to the homepage
  if (!currentLocale) {
    return { layout, query };
  }

  const editLayoutPath = getPathToContentType(['layouts', 'edit']);
  const editLayout = get(layout, editLayoutPath);
  const nextEditLayout = enhanceEditLayout(editLayout);

  const enhancedLayouts = {
    ...layout.contentType.layouts,
    edit: nextEditLayout,
  };

  const components = enhanceComponentsLayout(layout.components, currentLocale);

  const enhancedData = {
    query,
    layout: {
      ...layout,
      contentType: {
        ...layout.contentType,
        layouts: enhancedLayouts,
      },
      components,
    },
  };

  return enhancedData;
};

export default mutateEditViewLayoutHook;
export { enhanceComponentLayoutForRelations, enhanceComponentsLayout, enhanceEditLayout };
