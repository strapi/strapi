import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { Select, Option } from '@strapi/design-system/Select';
import { Box } from '@strapi/design-system/Box';
import { useTracking } from '@strapi/helper-plugin';
import { onChangeListHeaders } from '../actions';
import { selectDisplayedHeaders } from '../selectors';
import getAllAllowedHeaders from './utils/getAllAllowedHeader';

const FieldPicker = ({ layout }) => {
  const dispatch = useDispatch();
  const displayedHeaders = useSelector(selectDisplayedHeaders);
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();

  const allAllowedHeaders = getAllAllowedHeaders(layout.contentType.attributes).map(attrName => {
    const metadatas = layout.contentType.metadatas[attrName].list;

    return {
      name: attrName,
      intlLabel: { id: metadatas.label, defaultMessage: metadatas.label },
    };
  });
  const values = displayedHeaders.map(({ name }) => name);

  const handleChange = updatedValues => {
    trackUsage('didChangeDisplayedFields');

    // removing a header
    if (updatedValues.length < values.length) {
      const removedHeader = values.filter(value => {
        return updatedValues.indexOf(value) === -1;
      });

      dispatch(onChangeListHeaders({ name: removedHeader[0], value: true }));
    } else {
      const addedHeader = updatedValues.filter(value => {
        return values.indexOf(value) === -1;
      });

      dispatch(onChangeListHeaders({ name: addedHeader[0], value: false }));
    }
  };

  return (
    <Box paddingTop={1} paddingBottom={1}>
      <Select
        aria-label="change displayed fields"
        value={values}
        onChange={handleChange}
        customizeContent={values => `${values.length} currently selected`}
        multi
        size="S"
      >
        {allAllowedHeaders.map(header => {
          return (
            <Option key={header.name} value={header.name}>
              {formatMessage({
                id: header.intlLabel.id || header.name,
                defaultMessage: header.intlLabel.defaultMessage || header.name,
              })}
            </Option>
          );
        })}
      </Select>
    </Box>
  );
};

FieldPicker.propTypes = {
  layout: PropTypes.shape({
    contentType: PropTypes.shape({
      attributes: PropTypes.object.isRequired,
      metadatas: PropTypes.object.isRequired,
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
