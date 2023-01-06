import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Tooltip } from '@strapi/design-system/Tooltip';
import { Typography } from '@strapi/design-system/Typography';

import CellValue from '../CellValue';

const TypographyMaxWidth = styled(Typography)`
  max-width: 250px;
`;

const SingleComponentCell = ({ value, metadatas }) => {
  const { mainField } = metadatas;
  const content = value[mainField.name];

  return (
    <Tooltip label={content}>
      <TypographyMaxWidth textColor="neutral800" ellipsis>
        <CellValue type={mainField.type} value={content} />
      </TypographyMaxWidth>
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
