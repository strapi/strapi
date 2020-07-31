import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { LayoutIcon, CheckPermissions } from 'strapi-helper-plugin';
import { Button as Base } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import pluginPermissions from '../../../permissions';

const StyledButton = styled(Base)`
  padding-left: 15px;
  padding-right: 15px;
`;

const Button = ({ onClick, isTemporary, isInContentTypeView, contentTypeKind }) => {
  const { formatMessage } = useIntl();
  const {
    collectionTypesConfigurations,
    componentsConfigurations,
    singleTypesConfigurations,
  } = pluginPermissions;
  const icon = <LayoutIcon className="colored" fill={isTemporary ? '#B4B6BA' : '#007eff'} />;
  const label = formatMessage({ id: 'content-type-builder.form.button.configure-view' });
  let permissionsToApply = collectionTypesConfigurations;

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
        onClick={onClick}
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
  onClick: () => {},
};

Button.propTypes = {
  contentTypeKind: PropTypes.string,
  isInContentTypeView: PropTypes.bool,
  isTemporary: PropTypes.bool,
  onClick: PropTypes.func,
};

export default Button;
