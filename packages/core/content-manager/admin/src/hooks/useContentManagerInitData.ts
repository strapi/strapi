import { useEffect } from 'react';

import {
  useAuth,
  type Permission,
  useNotification,
  useStrapiApp,
  useAPIErrorHandler,
} from '@strapi/admin/strapi-admin';
import { useNotifyAT } from '@strapi/design-system';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';

import { COLLECTION_TYPES, SINGLE_TYPES } from '../constants/collections';
import { HOOKS } from '../constants/hooks';
import { AppState, setInitialData } from '../modules/app';
import { useTypedDispatch, useTypedSelector } from '../modules/hooks';
import { useGetAllContentTypeSettingsQuery } from '../services/contentTypes';
import { useGetInitialDataQuery } from '../services/init';
import { getTranslation } from '../utils/translations';

import type { Component } from '../../../shared/contracts/components';
import type {
  ContentType,
  FindContentTypesSettings,
} from '../../../shared/contracts/content-types';
import type { GetInitData } from '../../../shared/contracts/init';

const { MUTATE_COLLECTION_TYPES_LINKS, MUTATE_SINGLE_TYPES_LINKS } = HOOKS;

interface ContentManagerLink {
  permissions: Permission[];
  search: string | null;
  kind: string;
  title: string;
  to: string;
  uid: string;
  name: string;
  isDisplayed: boolean;
}

const useContentManagerInitData = (): AppState => {
  const { toggleNotification } = useNotification();
  const dispatch = useTypedDispatch();
  const runHookWaterfall = useStrapiApp(
    'useContentManagerInitData',
    (state) => state.runHookWaterfall
  );
  const { notifyStatus } = useNotifyAT();
  const { formatMessage } = useIntl();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler(getTranslation);
  const checkUserHasPermissions = useAuth(
    'useContentManagerInitData',
    (state) => state.checkUserHasPermissions
  );

  const state = useTypedSelector((state) => state['content-manager'].app);

  const initialDataQuery = useGetInitialDataQuery(undefined, {
    /**
     * TODO: remove this when the CTB has been refactored to use redux-toolkit-query
     * and it can invalidate the cache on mutation
     */
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    if (initialDataQuery.data) {
      notifyStatus(
        formatMessage({
          id: getTranslation('App.schemas.data-loaded'),
          defaultMessage: 'The schemas have been successfully loaded.',
        })
      );
    }
  }, [formatMessage, initialDataQuery.data, notifyStatus]);

  useEffect(() => {
    if (initialDataQuery.error) {
      toggleNotification({ type: 'danger', message: formatAPIError(initialDataQuery.error) });
    }
  }, [formatAPIError, initialDataQuery.error, toggleNotification]);

  const contentTypeSettingsQuery = useGetAllContentTypeSettingsQuery();

  useEffect(() => {
    if (contentTypeSettingsQuery.error) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(contentTypeSettingsQuery.error),
      });
    }
  }, [formatAPIError, contentTypeSettingsQuery.error, toggleNotification]);

  const formatData = async (
    components: Component[],
    contentTypes: ContentType[],
    fieldSizes: GetInitData.Response['data']['fieldSizes'],
    contentTypeConfigurations: FindContentTypesSettings.Response['data']
  ) => {
    /**
     * We group these by the two types we support. We do with an object because we can use default
     * values of arrays to make sure we always have an array to manipulate further on if, for example,
     * a user has not made any single types.
     *
     * This means we have to manually add new content types to this hook if we add a new type – but
     * the safety is worth it.
     */
    const { collectionType: collectionTypeLinks, singleType: singleTypeLinks } =
      contentTypes.reduce<{
        collectionType: ContentType[];
        singleType: ContentType[];
      }>(
        (acc, model) => {
          acc[model.kind].push(model);
          return acc;
        },
        {
          collectionType: [],
          singleType: [],
        }
      );
    const collectionTypeSectionLinks = generateLinks(
      collectionTypeLinks,
      'collectionTypes',
      contentTypeConfigurations
    );
    const singleTypeSectionLinks = generateLinks(singleTypeLinks, 'singleTypes');

    // Collection Types verifications
    const collectionTypeLinksPermissions = await Promise.all(
      collectionTypeSectionLinks.map(({ permissions }) => checkUserHasPermissions(permissions))
    );

    const authorizedCollectionTypeLinks = collectionTypeSectionLinks.filter(
      (_, index) => collectionTypeLinksPermissions[index].length > 0
    );

    // Single Types verifications
    const singleTypeLinksPermissions = await Promise.all(
      singleTypeSectionLinks.map(({ permissions }) => checkUserHasPermissions(permissions))
    );
    const authorizedSingleTypeLinks = singleTypeSectionLinks.filter(
      (_, index) => singleTypeLinksPermissions[index].length > 0
    );
    const { ctLinks } = runHookWaterfall(MUTATE_COLLECTION_TYPES_LINKS, {
      ctLinks: authorizedCollectionTypeLinks,
      models: contentTypes,
    });
    const { stLinks } = runHookWaterfall(MUTATE_SINGLE_TYPES_LINKS, {
      stLinks: authorizedSingleTypeLinks,
      models: contentTypes,
    });

    dispatch(
      setInitialData({
        authorizedCollectionTypeLinks: ctLinks,
        authorizedSingleTypeLinks: stLinks,
        components,
        contentTypeSchemas: contentTypes,
        fieldSizes,
      })
    );
  };

  useEffect(() => {
    if (initialDataQuery.data && contentTypeSettingsQuery.data) {
      formatData(
        initialDataQuery.data.components,
        initialDataQuery.data.contentTypes,
        initialDataQuery.data.fieldSizes,
        contentTypeSettingsQuery.data
      );
    }
  }, [initialDataQuery.data, contentTypeSettingsQuery.data]);

  return { ...state };
};

const generateLinks = (
  links: ContentType[],
  type: 'collectionTypes' | 'singleTypes',
  configurations: FindContentTypesSettings.Response['data'] = []
) => {
  return links
    .filter((link) => link.isDisplayed)
    .map((link) => {
      const collectionTypesPermissions = [
        { action: 'plugin::content-manager.explorer.create', subject: link.uid },
        { action: 'plugin::content-manager.explorer.read', subject: link.uid },
      ];
      const singleTypesPermissions = [
        { action: 'plugin::content-manager.explorer.read', subject: link.uid },
      ];
      const permissions =
        type === 'collectionTypes' ? collectionTypesPermissions : singleTypesPermissions;

      const currentContentTypeConfig = configurations.find(({ uid }) => uid === link.uid);

      let search = null;

      if (currentContentTypeConfig) {
        const searchParams = {
          page: 1,
          pageSize: currentContentTypeConfig.settings.pageSize,
          sort: `${currentContentTypeConfig.settings.defaultSortBy}:${currentContentTypeConfig.settings.defaultSortOrder}`,
        };

        search = stringify(searchParams, { encode: false });
      }

      return {
        permissions,
        search,
        kind: link.kind,
        title: link.info.displayName,
        to: `/content-manager/${link.kind === 'collectionType' ? COLLECTION_TYPES : SINGLE_TYPES}/${
          link.uid
        }`,
        uid: link.uid,
        // Used for the list item key in the helper plugin
        name: link.uid,
        isDisplayed: link.isDisplayed,
      } satisfies ContentManagerLink;
    });
};

export { useContentManagerInitData };
export type { ContentManagerLink };
