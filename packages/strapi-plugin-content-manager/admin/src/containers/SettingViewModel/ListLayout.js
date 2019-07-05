import React from 'react';
import PropTypes from 'prop-types';

import pluginId from '../../pluginId';

import ListField from './ListField';

function ListLayout({ displayedData, onRemove }) {
  const handleRemove = index => {
    if (displayedData.length > 1) {
      onRemove(index);
      return;
    }

    strapi.notification.info(`${pluginId}.notification.info.minimumFields`);
  };
  return (
    <>
      <div className="col-lg-5 col-md-12">
        {displayedData.map((data, index) => (
          <ListField
            key={data}
            index={index}
            name={data}
            onRemove={handleRemove}
          />
        ))}
      </div>
      <div className="col-lg-7 col-md-12">Form</div>
    </>
  );
}

ListLayout.defaultProps = {
  displayedData: [],
  onRemove: () => {},
};

ListLayout.propTypes = {
  displayedData: PropTypes.array,
  onRemove: PropTypes.func,
};

export default ListLayout;
