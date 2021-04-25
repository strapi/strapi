import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Padded } from '@buffetjs/core';
import ListWrapper from './ListWrapper';
import PermissionRow from './Row';

const PluginsAndSettingsPermissions = ({ isFormDisabled, kind, layout }) => {
  const [openedCategory, setOpenedCategory] = useState(null);

  const handleOpenCategory = categoryName => {
    setOpenedCategory(categoryName === openedCategory ? null : categoryName);
  };

  return (
    <ListWrapper>
      <Padded left right size="md">
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
      </Padded>
    </ListWrapper>
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
