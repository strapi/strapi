import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Padded, Text } from '@buffetjs/core';

import { usePermissionsContext } from '../../../../hooks';
import PluginsListWrapper from './PluginsListWrapper';
import PluginRow from './PluginRow';

const PluginsPermissions = () => {
  const { permissionsLayout } = usePermissionsContext();

  console.log(permissionsLayout);

  return (
    <Padded left right bottom top size="md">
      <PluginsListWrapper>
        <PluginRow>
          <Text fontWeight="bold" fontSize="xs" textTransform="uppercase">
            CONTENT-TYPES BUILDER
          </Text>
          <Text>Permissions settings </Text>
        </PluginRow>
      </PluginsListWrapper>
    </Padded>
  );
};

export default PluginsPermissions;
