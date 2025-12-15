import { memo } from 'react';

import { type Permission, useRBAC } from '@strapi/admin/strapi-admin';
import { Button } from '@strapi/design-system';
import { ListPlus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import type { Component, ContentType } from '../../types';

const cmPermissions: Record<string, Permission[]> = {
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

const getPermission = (type: Component | ContentType) => {
  if (type.modelType === 'contentType') {
    if (type.kind === 'singleType') {
      return cmPermissions.singleTypesConfigurations;
    }

    return cmPermissions.collectionTypesConfigurations;
  }

  return cmPermissions.componentsConfigurations;
};

interface LinkToCMSettingsViewProps {
  disabled: boolean;
  type: Component | ContentType;
}

const getLink = (type: Component | ContentType) => {
  switch (type.modelType) {
    case 'contentType':
      switch (type.kind) {
        case 'singleType':
          return `/content-manager/single-types/${type.uid}/configurations/edit`;
        case 'collectionType':
          return `/content-manager/collection-types/${type.uid}/configurations/edit`;
      }
    case 'component':
      return `/content-manager/components/${type.uid}/configurations/edit`;
  }
};

const StyledButton = styled(Button)`
  white-space: nowrap;
`;

export const LinkToCMSettingsView = memo(({ disabled, type }: LinkToCMSettingsViewProps) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const permissionsToApply = getPermission(type);

  const label = formatMessage({
    id: 'content-type-builder.form.button.configure-view',
    defaultMessage: 'Configure the view',
  });

  const handleClick = () => {
    if (disabled) {
      return false;
    }

    const link = getLink(type);

    navigate(link);

    return false;
  };

  const { isLoading, allowedActions } = useRBAC(permissionsToApply);

  if (isLoading) {
    return null;
  }

  if (!allowedActions.canConfigureView && !allowedActions.canConfigureLayout) {
    return null;
  }

  return (
    <StyledButton
      startIcon={<ListPlus />}
      variant="tertiary"
      onClick={handleClick}
      disabled={disabled}
    >
      {label}
    </StyledButton>
  );
});
