import React from 'react';

import { Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';
import styled from 'styled-components';

import CellValue from '../CellValue';

const TypographyMaxWidth = styled(Typography)`
  max-width: 500px;
`;

const RelationSingle = ({ metadatas, value }) => {
  return (
    <TypographyMaxWidth textColor="neutral800" ellipsis>
      <CellValue
        type={metadatas.mainField.schema.type}
        value={value[metadatas.mainField.name] ?? value.id}
      />
    </TypographyMaxWidth>
  );
};

RelationSingle.propTypes = {
  metadatas: PropTypes.shape({
    mainField: PropTypes.shape({
      name: PropTypes.string.isRequired,
      schema: PropTypes.shape({ type: PropTypes.string.isRequired }).isRequired,
    }),
  }).isRequired,
  value: PropTypes.object.isRequired,
};

export default RelationSingle;
