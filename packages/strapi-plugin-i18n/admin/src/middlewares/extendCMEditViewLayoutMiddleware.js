import React from 'react';
import get from 'lodash/get';
import { Globe, GlobeCrossed } from '@buffetjs/icons';

const enhanceRelationLayout = layout =>
  layout.reduce((acc, current) => {
    const labelIcon = {
      title: 'localized',
      icon: <Globe />,
    };
    acc.push({ ...current, labelIcon });

    return acc;
  }, []);

const enhanceEditLayout = layout =>
  layout.reduce((rows, row) => {
    const enhancedRow = row.reduce((acc, field) => {
      const hasI18nEnabled = get(
        field,
        ['fieldSchema', 'pluginOptions', 'i18n', 'localized'],
        false
      );

      const labelIcon = {
        title: hasI18nEnabled ? 'localized' : 'common to all locales',
        icon: hasI18nEnabled ? <Globe /> : <GlobeCrossed />,
      };

      acc.push({ ...field, labelIcon });

      return acc;
    }, []);

    rows.push(enhancedRow);

    return rows;
  }, []);

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

  const editLayoutPath = getPathToContentType(['layouts', 'edit']);
  const editRelationsPath = getPathToContentType(['layouts', 'editRelations']);
  const editLayout = get(action, editLayoutPath);
  const editRelationsLayout = get(action, editRelationsPath);
  const nextEditRelationLayout = enhanceRelationLayout(editRelationsLayout);
  const nextEditLayout = enhanceEditLayout(editLayout);

  const enhancedLayouts = {
    ...action.layout.contentType.layouts,
    editRelations: nextEditRelationLayout,
    edit: nextEditLayout,
  };
  const enhancedAction = {
    ...action,
    layout: {
      ...action.layout,
      contentType: {
        ...action.layout.contentType,
        layouts: enhancedLayouts,
      },
    },
  };
  // set(action, editRelationsPath, nextEditRelationLayout);

  return next(enhancedAction);
};

const getPathToContentType = pathArray => ['layout', 'contentType', ...pathArray];

export default extendCMEditViewLayoutMiddleware;
export { enhanceEditLayout, enhanceRelationLayout };
