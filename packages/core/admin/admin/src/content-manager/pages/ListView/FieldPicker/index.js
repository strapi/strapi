import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { Select, Option } from '@strapi/parts/Select';
import { useTracking } from '@strapi/helper-plugin';
import { onChangeListHeaders } from '../actions';
import { selectDisplayedHeaders } from '../selectors';
import getAllAllowedHeaders from './utils/getAllAllowedHeader';

const FieldPicker = ({ layout }) => {
  const dispatch = useDispatch();
  const displayedHeaders = useSelector(selectDisplayedHeaders);
  const { trackUsage } = useTracking();

  const allAllowedHeaders = getAllAllowedHeaders(layout.contentType.attributes);
  const values = displayedHeaders.map(({ name }) => name);

  const handleChange = updatedValues => {
    // removing a header
    if (updatedValues.length < values.length) {
      const removedHeader = values.filter(value => {
        return updatedValues.indexOf(value) === -1;
      });

      dispatch(onChangeListHeaders({ name: removedHeader[0], value: true }));
    } else {
      trackUsage('didChangeDisplayedFields');
      const addedHeader = updatedValues.filter(value => {
        return values.indexOf(value) === -1;
      });

      dispatch(onChangeListHeaders({ name: addedHeader[0], value: false }));
    }
  };

  return (
    <Select
      id="select1"
      label="Choose your meal"
      placeholder="Your example"
      value={values}
      onChange={handleChange}
      customizeContent={values => `${values.length} currently selected`}
      multi
      size="S"
    >
      {allAllowedHeaders.map(header => {
        return (
          <Option key={header} value={header}>
            {header}
          </Option>
        );
      })}
    </Select>
  );
};

FieldPicker.propTypes = {
  layout: PropTypes.shape({
    contentType: PropTypes.shape({
      attributes: PropTypes.object.isRequired,
      metadatas: PropTypes.object.isRequired,
      info: PropTypes.shape({ label: PropTypes.string.isRequired }).isRequired,
      layouts: PropTypes.shape({
        list: PropTypes.array.isRequired,
        editRelations: PropTypes.array,
      }).isRequired,
      options: PropTypes.object.isRequired,
      settings: PropTypes.object.isRequired,
    }).isRequired,
  }).isRequired,
};

export default memo(FieldPicker);
