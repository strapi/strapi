import React from 'react';
import styled from 'styled-components';
import Text from '../Text';

const Title = styled(props => <Text {...props} color="black" />)`
  width: 100%;
  margin-bottom: 3px;
  margin-top: 7px;
`;

// const Title = styled.p`
//   width: 100%;
//   margin-bottom: 3px;
//   margin-top: 7px;

//   font-size: 1.3rem;
//   line-height: normal;
//   font-weight: 600;
//   white-space: nowrap;
//   overflow: hidden;
//   text-overflow: ellipsis;

//   color: #333740;
// `;

export default Title;
