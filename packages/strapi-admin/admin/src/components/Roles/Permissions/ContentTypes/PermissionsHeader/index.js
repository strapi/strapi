import React from 'react';
import { Flex } from '@buffetjs/core';
import { useIntl } from 'react-intl';

import PermissionCheckbox from '../PermissionCheckbox';
import Wrapper from './Wrapper';

const PermissionsHeader = () => {
  const { formatMessage } = useIntl();

  return (
    <Wrapper>
      <Flex>
        <PermissionCheckbox
          name="create"
          message={formatMessage({
            id: 'Settings.roles.form.permissions.create',
            defaultMessage: 'Create',
          })}
        />
        <PermissionCheckbox
          name="read"
          message={formatMessage({
            id: 'Settings.roles.form.permissions.read',
            defaultMessage: 'Read',
          })}
        />
        <PermissionCheckbox
          name="update"
          message={formatMessage({
            id: 'Settings.roles.form.permissions.update',
            defaultMessage: 'Update',
          })}
        />
        <PermissionCheckbox
          name="delete"
          message={formatMessage({
            id: 'Settings.roles.form.permissions.delete',
            defaultMessage: 'Delete',
          })}
        />
      </Flex>
    </Wrapper>
  );
};

export default PermissionsHeader;
