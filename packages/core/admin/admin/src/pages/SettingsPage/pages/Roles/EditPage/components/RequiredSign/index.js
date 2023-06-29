import React from 'react';

import styled from 'styled-components';

const Required = styled.span`
  color: ${({ theme }) => theme.colors.danger700};
  padding-left: ${({ theme }) => theme.spaces[1]}px;
`;

const RequiredSign = () => <Required>*</Required>;

export default RequiredSign;
