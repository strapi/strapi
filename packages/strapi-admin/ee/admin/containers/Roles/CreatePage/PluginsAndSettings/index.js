import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Padded } from '@buffetjs/core';
import ListWrapper from './ListWrapper';
import PermissionRow from './Row';

const PluginsAndSettingsPermissions = ({ kind, layout }) => {
  const [openedCategory, setOpenedCategory] = useState(null);

  const handleOpenCategory = categoryName => {
    setOpenedCategory(categoryName === openedCategory ? null : categoryName);
  };

  return (
    <ListWrapper>
      <Padded left right size="md">
        {layout.map(({ category, childrenForm }, index) => {
          // console.log({ permissionLayout });
          console.log({ category, childrenForm });

          return (
            <PermissionRow
              key={category}
              childrenForm={childrenForm}
              kind={kind}
              isOpen={openedCategory === category}
              isWhite={index % 2 === 1}
              name={category}
              onOpenCategory={handleOpenCategory}
              // permissions={permissionLayout}
            />
          );
        })}
      </Padded>
    </ListWrapper>
  );
};

PluginsAndSettingsPermissions.propTypes = {
  kind: PropTypes.string.isRequired,
  layout: PropTypes.arrayOf(
    PropTypes.shape({
      category: PropTypes.string.isRequired,
      childrenForm: PropTypes.arrayOf(
        PropTypes.shape({
          actions: PropTypes.array.isRequired,
        })
      ).isRequired,
    }).isRequired
  ).isRequired,
};

export default PluginsAndSettingsPermissions;
