import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Typography } from '@strapi/design-system/Typography';
import { Box } from '@strapi/design-system/Box';
import StepNumber from './StepNumber';
import StepLine from './StepLine';

const GridItemAlignCenter = styled(Box)`
  align-self: center;
`;

const GridItemJustifyCenter = styled(GridItemAlignCenter)`
  height: 100%;
  justify-self: center;
`;

const Step = ({ type, title, number, content, modal }) => {
  return (
    <>
      <GridItemAlignCenter>
        <StepNumber type={type} number={number} />
      </GridItemAlignCenter>
      <GridItemAlignCenter>
        <Typography variant={modal ? 'alpha' : 'delta'} as="h3">
          {title}
        </Typography>
      </GridItemAlignCenter>
      <GridItemJustifyCenter background="neutral100">
        <StepLine />
      </GridItemJustifyCenter>
      <GridItemAlignCenter>{content}</GridItemAlignCenter>
    </>
  );
};

Step.defaultProps = {
  content: undefined,
  modal: false,
  number: undefined,
  type: 'isNotDone',
};

Step.propTypes = {
  content: PropTypes.node,
  modal: PropTypes.bool,
  number: PropTypes.number,
  title: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['isCurrent', 'isDone', 'isNotDone']),
};

export default Step;
