import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { CheckPermissions } from '@strapi/helper-plugin';
import { Button } from '@strapi/parts/Button';
import ConfigureIcon from '@strapi/icons/ConfigureIcon';
import { useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';

const cmPermissions = {
  collectionTypesConfigurations: [
    {
      action: 'plugin::content-manager.collection-types.configure-view',
      subject: null,
    },
  ],
  componentsConfigurations: [
    {
      action: 'plugin::content-manager.components.configure-layout',
      subject: null,
    },
  ],
  singleTypesConfigurations: [
    {
      action: 'plugin::content-manager.single-types.configure-view',
      subject: null,
    },
  ],
};

const LinkToCMSettingsView = ({ isTemporary, isInContentTypeView, contentTypeKind, targetUid }) => {
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const {
    collectionTypesConfigurations,
    componentsConfigurations,
    singleTypesConfigurations,
  } = cmPermissions;
  const label = formatMessage({ id: 'content-type-builder.form.button.configure-view' });
  let permissionsToApply = collectionTypesConfigurations;

  const handleClick = () => {
    if (isTemporary) {
      return false;
    }

    if (isInContentTypeView) {
      push(`/content-manager/collectionType/${targetUid}/configurations/edit`);
    } else {
      push(`/content-manager/components/${targetUid}/configurations/edit`);
    }

    return false;
  };

  if (isInContentTypeView && contentTypeKind === 'singleType') {
    permissionsToApply = singleTypesConfigurations;
  }

  if (!isInContentTypeView) {
    permissionsToApply = componentsConfigurations;
  }

  return (
    <CheckPermissions permissions={permissionsToApply}>
      <Button
        startIcon={<ConfigureIcon />}
        variant="tertiary"
        onClick={handleClick}
        disabled={isTemporary}
      >
        {label}
      </Button>
    </CheckPermissions>
  );
};

LinkToCMSettingsView.defaultProps = {
  contentTypeKind: 'collectionType',
  isInContentTypeView: true,
  isTemporary: false,
  targetUid: '',
};

LinkToCMSettingsView.propTypes = {
  contentTypeKind: PropTypes.string,
  isInContentTypeView: PropTypes.bool,
  isTemporary: PropTypes.bool,
  targetUid: PropTypes.string,
};

export default memo(LinkToCMSettingsView);
