import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from '@strapi/design-system/Tooltip';
import { Typography } from '@strapi/design-system/Typography';

import CellValue from '../CellValue';

const SingleComponentCell = ({ value, metadatas }) => {
  const { mainField } = metadatas;
  const content = value[mainField.name];

  return (
    <Tooltip label={content}>
      <Typography textColor="neutral800" ellipsis>
        <CellValue type={mainField.type} value={content} />
      </Typography>
    </Tooltip>
  );
};

SingleComponentCell.propTypes = {
  metadatas: PropTypes.shape({
    mainField: PropTypes.shape({
      name: PropTypes.string,
      type: PropTypes.string,
      value: PropTypes.string,
    }),
  }).isRequired,
  value: PropTypes.object.isRequired,
};

export default SingleComponentCell;
