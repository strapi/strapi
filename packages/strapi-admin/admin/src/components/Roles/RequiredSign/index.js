import React from 'react';
import styled from 'styled-components';

const Required = styled.span`
  color: ${({ theme }) => theme.main.colors.red};
  padding-left: 2px;
`;

const RequiredSign = () => <Required>*</Required>;

export default RequiredSign;
