import React from 'react';

import Tabs from '../Tabs';
import ContentTypes from './ContentTypes';
import PluginsPermissions from './Plugins';
import SettingsPermissions from './Settings';
import { roleTabsLabel } from '../../../utils';
import { useContentTypes } from '../../../hooks';

const Permissions = () => {
  const { singleTypes, collectionTypes } = useContentTypes();

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
