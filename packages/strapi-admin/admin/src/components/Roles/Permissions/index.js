import React, { useReducer, useEffect } from 'react';
import { request } from 'strapi-helper-plugin';

import Tabs from '../Tabs';
import ContentTypes from './ContentTypes';
import PluginsPermissions from './Plugins';
import SettingsPermissions from './Settings';
import reducer, { initialState } from './reducer';
import { roleTabsLabel } from '../../../utils';

const Permissions = () => {
  const [{ collectionTypes, singleTypes }, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    fetchContentTypes();
  }, []);

  const fetchContentTypes = async () => {
    try {
      const { data } = await request('/content-manager/content-types', {
        method: 'GET',
      });

      dispatch({
        type: 'GET_CONTENT_TYPES_SUCCEDED',
        data,
      });
    } catch (err) {
      dispatch({
        type: 'GET_CONTENT_TYPES_ERROR',
      });
      strapi.notification.error('notification.error');
    }
  };

  return (
    <Tabs tabsLabel={roleTabsLabel}>
      <ContentTypes contentTypes={collectionTypes} />
      <ContentTypes contentTypes={singleTypes} />
      <PluginsPermissions />
      <SettingsPermissions />
    </Tabs>
  );
};

export default Permissions;
