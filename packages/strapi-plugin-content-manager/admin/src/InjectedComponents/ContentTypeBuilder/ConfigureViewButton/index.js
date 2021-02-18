import React, { memo } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { LayoutIcon, CheckPermissions } from 'strapi-helper-plugin';
import { Button as Base } from '@buffetjs/core';
import { useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import pluginPermissions from '../../../permissions';
import pluginId from '../../../pluginId';

const StyledButton = styled(Base)`
  padding-left: 15px;
  padding-right: 15px;
`;

const Button = ({ isTemporary, isInContentTypeView, contentTypeKind, targetUid }) => {
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const {
    collectionTypesConfigurations,
    componentsConfigurations,
    singleTypesConfigurations,
  } = pluginPermissions;
  const icon = <LayoutIcon className="colored" fill={isTemporary ? '#B4B6BA' : '#007eff'} />;
  const label = formatMessage({ id: 'content-type-builder.form.button.configure-view' });
  let permissionsToApply = collectionTypesConfigurations;

  const handleClick = () => {
    if (isTemporary) {
      return false;
    }

    if (isInContentTypeView) {
      push(`/plugins/${pluginId}/collectionType/${targetUid}/configurations/edit`);
    } else {
      push(`/plugins/${pluginId}/components/${targetUid}/configurations/edit`);
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

Button.defaultProps = {
  contentTypeKind: 'collectionType',
  isInContentTypeView: true,
  isTemporary: false,
  targetUid: '',
};

Button.propTypes = {
  contentTypeKind: PropTypes.string,
  isInContentTypeView: PropTypes.bool,
  isTemporary: PropTypes.bool,
  targetUid: PropTypes.string,
};

export default memo(Button);
