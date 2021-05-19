import React, { memo } from 'react';
import { useGlobalContext } from '@strapi/helper-plugin';
import { get } from 'lodash';
import { useParams } from 'react-router-dom';
import PageTitle from '../../../../components/SettingsPageTitle';

const SettingDispatcher = () => {
  const { plugins } = useGlobalContext();
  const { pluginId } = useParams();

  const pluginToRender = get(plugins, [pluginId, 'settings', 'mainComponent'], null);

  if (!pluginToRender) {
    return null;
  }

  const Compo = pluginToRender;

  return (
    <>
      <PageTitle name={pluginId} />
      {/* FIXME */}
      <Compo />
    </>
  );
};

export default memo(SettingDispatcher);
