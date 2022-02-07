import React from 'react';
import PropTypes from 'prop-types';
import { Flex } from '@strapi/design-system/Flex';
import { Tooltip } from '@strapi/design-system/Tooltip';
import { Typography } from '@strapi/design-system/Typography';
import { stopPropagation } from '@strapi/helper-plugin';

import CellValue from '../CellValue';

const SingleComponentCell = ({ value, metadatas, component }) => {
  const { mainField } = metadatas;
  const content = value?.[mainField];
  const type = component?.attributes?.[mainField]?.type;

  return (
    <Flex {...stopPropagation}>
      <Tooltip label={content}>
        <Typography textColor="neutral800" ellipsis>
          <CellValue type={type} value={content} />
        </Typography>
      </Tooltip>
    </Flex>
  );
};

SingleComponentCell.propTypes = {
  metadatas: PropTypes.shape({
    mainField: PropTypes.string.isRequired,
  }).isRequired,
  value: PropTypes.object.isRequired,
  component: PropTypes.shape({
    attributes: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
};

export default SingleComponentCell;
