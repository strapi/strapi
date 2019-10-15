import React from 'react';
import PropTypes from 'prop-types';
import { upperFirst } from 'lodash';
import pluginId from '../../pluginId';
import SettingsViewWrapper from '../../components/SettingsViewWrapper';

const SettingViewList = ({
  match: {
    params: { slug },
  },
}) => {
  const getPluginHeaderActions = () => {
    // if (isEqual(modifiedData, initialData)) {
    //   return [];
    // }

    return [
      {
        label: `${pluginId}.popUpWarning.button.cancel`,
        kind: 'secondary',
        // onClick: toggleWarningCancel,
        type: 'button',
      },
      {
        kind: 'primary',
        label: `${pluginId}.containers.Edit.submit`,
        // onClick: e => {
        //   handleSubmit(e);
        // },
        type: 'submit',
      },
    ];
  };
  return (
    <SettingsViewWrapper
      pluginHeaderProps={{
        actions: getPluginHeaderActions(),
        title: {
          id: `${pluginId}.components.SettingsViewWrapper.pluginHeader.title`,
          values: { name: upperFirst(slug) },
        },
        description: {
          id: `${pluginId}.components.SettingsViewWrapper.pluginHeader.description.list-settings`,
        },
      }}
    >
      fuck
    </SettingsViewWrapper>
  );
};

SettingViewList.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      slug: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};

export default SettingViewList;
