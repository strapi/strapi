import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Padded } from '@buffetjs/core';

import ListWrapper from './ListWrapper';
import PermissionRow from './PermissionRow';

const PluginsAndSettingsPermissions = ({ pluginsPermissionsLayout, permissionType }) => {
  const [openedCategory, setOpenedCategory] = useState();

  const handleOpenCategory = categoryName => {
    setOpenedCategory(categoryName === openedCategory ? null : categoryName);
  };

  return (
    <ListWrapper>
      <Padded left right size="md">
        {pluginsPermissionsLayout.map((permissionLayout, index) => (
          <PermissionRow
            key={permissionLayout.category}
            permissionType={permissionType}
            isWhite={index % 2 === 1}
            onOpenCategory={() => handleOpenCategory(permissionLayout.category)}
            openedCategory={openedCategory}
            permissions={permissionLayout}
          />
        ))}
      </Padded>
    </ListWrapper>
  );
};

PluginsAndSettingsPermissions.defaultProps = {
  permissionType: null,
};
PluginsAndSettingsPermissions.propTypes = {
  pluginsPermissionsLayout: PropTypes.array.isRequired,
  permissionType: PropTypes.string,
};

export default PluginsAndSettingsPermissions;
