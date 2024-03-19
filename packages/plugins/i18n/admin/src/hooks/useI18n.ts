import * as React from 'react';

import { createSelector } from '@reduxjs/toolkit';
import { Store, unstable_useDocument as useDocument } from '@strapi/admin/strapi-admin';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { doesPluginOptionsHaveI18nLocalized } from '../utils/fields';
import { capitalize } from '../utils/strings';

type UseI18n = () => {
  hasI18n: boolean;
  canCreate: string[];
  canRead: string[];
  canUpdate: string[];
  canDelete: string[];
  canPublish: string[];
};

type RootState = ReturnType<Store['getState']>;

const makeSelectContentTypePermissions = () =>
  // @ts-expect-error – I have no idea why this fails like this.
  createSelector(
    (state: RootState) => state.rbacProvider.collectionTypesRelatedPermissions,
    (_, slug: string) => slug,
    (state: RootState['rbacProvider']['collectionTypesRelatedPermissions'], slug: string) => {
      const contentTypePermissions = slug ? state[slug] : {};

      return Object.entries(contentTypePermissions).reduce<Omit<ReturnType<UseI18n>, 'hasI18n'>>(
        (acc, [action, [permission]]) => {
          /**
           * The original action is in the format `plugins::content-manager.explorer.{ACTION}`,
           * we only want the last part of the string so our actions form properties like can{ACTION}
           */
          const [actionShorthand] = action.split('.').slice(-1);

          return {
            ...acc,
            [`can${capitalize(actionShorthand)}`]: permission.properties?.locales ?? [],
          };
        },
        {
          canCreate: [],
          canRead: [],
          canUpdate: [],
          canDelete: [],
          canPublish: [],
        }
      );
    }
  );

/**
 * @alpha
 * @description This hook is used to get the i18n status of a content type.
 * Also returns the CRUDP permission locale properties for the content type
 * so we know which locales the user can perform actions on.
 */
const useI18n: UseI18n = () => {
  // Extract the params from the URL to pass to our useDocument hook
  const params = useParams<{ collectionType: string; slug: string; model: string }>();

  const selectContentTypePermissions = React.useMemo(makeSelectContentTypePermissions, []);
  const actions = useSelector((state) => selectContentTypePermissions(state, params.slug));

  const { schema } = useDocument(
    {
      // We can non-null assert these because below we skip the query if they are not present
      collectionType: params.collectionType!,
      model: params.slug!,
    },
    {
      skip: !params.slug || !params.collectionType,
    }
  );

  if (doesPluginOptionsHaveI18nLocalized(schema?.pluginOptions)) {
    return {
      hasI18n: schema.pluginOptions.i18n.localized,
      ...actions,
    };
  }

  return {
    hasI18n: false,
    ...actions,
  };
};

export { useI18n };
