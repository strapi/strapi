import React from 'react';
import styled from 'styled-components';
import { Inputs } from '@buffetjs/custom';

const Wrapper = styled.div`
  > div {
    padding-bottom: 0;
  }
  label {
    display: none;
  }
  #value {
    max-width: 130px;
  }
`;

const DateTime = props => (
  <Wrapper>
    <Inputs type="datetime" {...props} />
  </Wrapper>
);

export default DateTime;
