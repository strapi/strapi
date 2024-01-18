import { memo } from 'react';

import { Button } from '@strapi/design-system';
import { CheckPermissions } from '@strapi/helper-plugin';
import { Layer } from '@strapi/icons';
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

interface LinkToCMSettingsViewProps {
  disabled: boolean;
  contentTypeKind?: string;
  isInContentTypeView?: boolean;
  isTemporary?: boolean;
  targetUid?: string;
}

export const LinkToCMSettingsView = memo(
  ({
    disabled,
    isTemporary = false,
    isInContentTypeView = true,
    contentTypeKind = 'collectionType',
    targetUid = '',
  }: LinkToCMSettingsViewProps) => {
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
        push(`/content-manager/collection-types/${targetUid}/configurations/edit`);
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
  }
);
