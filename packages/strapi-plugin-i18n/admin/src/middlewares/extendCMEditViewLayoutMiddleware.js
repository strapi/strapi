import React from 'react';
import get from 'lodash/get';
import { Globe, GlobeCrossed } from '@buffetjs/icons';
import { getTrad } from '../utils';

const enhanceRelationLayout = (layout, locale) =>
  layout.map(current => {
    const labelIcon = {
      title: {
        id: getTrad('Field.localized'),
        defaultMessage: 'This value is unique for the selected locale',
      },
      icon: <Globe />,
    };
    let queryInfos = current.queryInfos;

    if (get(current, ['targetModelPluginOptions', 'i18n', 'localized'], false)) {
      queryInfos = {
        ...queryInfos,
        defaultParams: { ...queryInfos.defaultParams, _locale: locale },
        paramsToKeep: ['plugins.i18n.locale'],
      };
    }

    return { ...current, labelIcon, queryInfos };
  });

const enhanceEditLayout = layout =>
  layout.map(row => {
    const enhancedRow = row.reduce((acc, field) => {
      const type = get(field, ['fieldSchema', 'type'], null);
      const hasI18nEnabled = get(
        field,
        ['fieldSchema', 'pluginOptions', 'i18n', 'localized'],
        type === 'uid'
      );

      const labelIcon = {
        title: {
          id: hasI18nEnabled ? getTrad('Field.localized') : getTrad('Field.not-localized'),
          defaultMessage: hasI18nEnabled
            ? 'This value is unique for the selected locale'
            : 'This value is common to all locales',
        },
        icon: hasI18nEnabled ? <Globe /> : <GlobeCrossed />,
      };

      acc.push({ ...field, labelIcon });

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
  layout.map(row => {
    const enhancedRow = row.reduce((acc, field) => {
      if (
        get(field, ['fieldSchema', 'type']) === 'relation' &&
        get(field, ['targetModelPluginOptions', 'i18n', 'localized'], false)
      ) {
        const queryInfos = {
          ...field.queryInfos,
          defaultParams: { ...field.queryInfos.defaultParams, _locale: locale },
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

const extendCMEditViewLayoutMiddleware = () => () => next => action => {
  if (action.type !== 'ContentManager/EditViewLayoutManager/SET_LAYOUT') {
    return next(action);
  }

  const hasi18nEnabled = get(
    action,
    getPathToContentType(['pluginOptions', 'i18n', 'localized']),
    false
  );

  if (!hasi18nEnabled) {
    return next(action);
  }

  const currentLocale = get(action, ['query', 'plugins', 'i18n', 'locale'], null);

  // This might break the cm, has the user might be redirected to the homepage
  if (!currentLocale) {
    return next(action);
  }

  const editLayoutPath = getPathToContentType(['layouts', 'edit']);
  const editRelationsPath = getPathToContentType(['layouts', 'editRelations']);
  const editLayout = get(action, editLayoutPath);
  const editRelationsLayout = get(action, editRelationsPath);
  const nextEditRelationLayout = enhanceRelationLayout(editRelationsLayout, currentLocale);
  const nextEditLayout = enhanceEditLayout(editLayout);

  const enhancedLayouts = {
    ...action.layout.contentType.layouts,
    editRelations: nextEditRelationLayout,
    edit: nextEditLayout,
  };
  const components = enhanceComponentsLayout(action.layout.components, currentLocale);

  const enhancedAction = {
    ...action,
    layout: {
      ...action.layout,
      contentType: {
        ...action.layout.contentType,
        layouts: enhancedLayouts,
      },
      components,
    },
  };

  return next(enhancedAction);
};

const getPathToContentType = pathArray => ['layout', 'contentType', ...pathArray];

export default extendCMEditViewLayoutMiddleware;
export {
  enhanceComponentLayoutForRelations,
  enhanceComponentsLayout,
  enhanceEditLayout,
  enhanceRelationLayout,
};
