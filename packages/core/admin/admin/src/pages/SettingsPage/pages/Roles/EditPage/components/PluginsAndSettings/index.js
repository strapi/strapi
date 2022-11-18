import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import PermissionRow from './Row';

const PluginsAndSettingsPermissions = ({ isFormDisabled, kind, layout }) => {
  const [openedCategory, setOpenedCategory] = useState(null);

  const handleOpenCategory = (categoryName) => {
    setOpenedCategory(categoryName === openedCategory ? null : categoryName);
  };

  return (
    <Box padding={6} background="neutral0">
      {layout.map(({ category, categoryId, childrenForm }, index) => {
        return (
          <PermissionRow
            key={category}
            childrenForm={childrenForm}
            kind={kind}
            isFormDisabled={isFormDisabled}
            isOpen={openedCategory === category}
            isWhite={index % 2 === 1}
            name={category}
            onOpenCategory={handleOpenCategory}
            pathToData={[kind, categoryId]}
          />
        );
      })}
    </Box>
  );
};

PluginsAndSettingsPermissions.propTypes = {
  isFormDisabled: PropTypes.bool.isRequired,
  kind: PropTypes.string.isRequired,
  layout: PropTypes.arrayOf(
    PropTypes.shape({
      category: PropTypes.string.isRequired,
      categoryId: PropTypes.string.isRequired,
      childrenForm: PropTypes.arrayOf(
        PropTypes.shape({
          actions: PropTypes.array.isRequired,
        })
      ).isRequired,
    }).isRequired
  ).isRequired,
};

export default PluginsAndSettingsPermissions;
