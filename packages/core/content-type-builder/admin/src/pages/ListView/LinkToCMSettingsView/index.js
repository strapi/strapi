import React, { memo } from 'react';

import { Button } from '@strapi/design-system';
import { CheckPermissions } from '@strapi/helper-plugin';
import { Layer } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';

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

const LinkToCMSettingsView = ({
  disabled,
  isTemporary,
  isInContentTypeView,
  contentTypeKind,
  targetUid,
}) => {
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const { collectionTypesConfigurations, componentsConfigurations, singleTypesConfigurations } =
    cmPermissions;
  const label = formatMessage({
    id: 'content-type-builder.form.button.configure-view',
    defaultMessage: 'Configure the view',
  });
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
        startIcon={<Layer />}
        variant="tertiary"
        onClick={handleClick}
        disabled={isTemporary || disabled}
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
  disabled: PropTypes.bool.isRequired,
  contentTypeKind: PropTypes.string,
  isInContentTypeView: PropTypes.bool,
  isTemporary: PropTypes.bool,
  targetUid: PropTypes.string,
};

export default memo(LinkToCMSettingsView);
