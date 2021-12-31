import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Grid } from '@strapi/design-system/Grid';

const GridCustom = styled(Grid)`
  gap: 12px 20px;
  grid-template-columns: 30px 1fr;
`;

const Stepper = ({ children }) => {
  return <GridCustom>{children}</GridCustom>;
};

Stepper.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Stepper;
