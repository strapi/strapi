import React, { memo } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { LayoutIcon, CheckPermissions } from '@strapi/helper-plugin';
import { Button as Base } from '@buffetjs/core';
import { useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';

const StyledButton = styled(Base)`
  padding-left: 15px;
  padding-right: 15px;
`;

const cmPermissions = {
  collectionTypesConfigurations: [
    {
      action: 'plugins::content-manager.collection-types.configure-view',
      subject: null,
    },
  ],
  componentsConfigurations: [
    {
      action: 'plugins::content-manager.components.configure-layout',
      subject: null,
    },
  ],
  singleTypesConfigurations: [
    {
      action: 'plugins::content-manager.single-types.configure-view',
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
  const icon = <LayoutIcon className="colored" fill={isTemporary ? '#B4B6BA' : '#007eff'} />;
  const label = formatMessage({ id: 'content-type-builder.form.button.configure-view' });
  let permissionsToApply = collectionTypesConfigurations;

  const handleClick = () => {
    if (isTemporary) {
      return false;
    }

    if (isInContentTypeView) {
      push(`/plugins/content-manager/collectionType/${targetUid}/configurations/edit`);
    } else {
      push(`/plugins/content-manager/components/${targetUid}/configurations/edit`);
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
      <StyledButton
        icon={icon}
        label={label}
        color="secondary"
        onClick={handleClick}
        style={{ marginTop: '2px' }}
        disabled={isTemporary}
      />
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
