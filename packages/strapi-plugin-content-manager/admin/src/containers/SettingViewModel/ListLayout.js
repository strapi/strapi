import React from 'react';
import PropTypes from 'prop-types';

import pluginId from '../../pluginId';

import Add from './Add';
import ListField from './ListField';

function ListLayout({
  addField,
  availableData,
  displayedData,
  fieldToEditIndex,
  onClick,
  onRemove,
}) {
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
            isSelected={fieldToEditIndex === index}
            name={data}
            onClick={onClick}
            onRemove={handleRemove}
          />
        ))}
        <Add data={availableData} onClick={addField} />
      </div>
      <div className="col-lg-7 col-md-12">Form</div>
    </>
  );
}

ListLayout.defaultProps = {
  addField: () => {},
  availableData: [],
  displayedData: [],
  fieldToEditIndex: 0,
  onClick: () => {},
  onRemove: () => {},
};

ListLayout.propTypes = {
  addField: PropTypes.func,
  availableData: PropTypes.array,
  displayedData: PropTypes.array,
  fieldToEditIndex: PropTypes.number,
  onClick: PropTypes.func,
  onRemove: PropTypes.func,
};

export default ListLayout;
