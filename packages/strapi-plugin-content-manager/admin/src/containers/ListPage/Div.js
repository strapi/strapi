/**
 *
 * Div
 * This component uses styled-components library for styling
 *
 */

import styled from 'styled-components';

const Div = styled.div`
  margin-top: ${props => props.increaseMargin ? '10px': '-2px'};
  margin-bottom: ${props => props.decreaseMarginBottom ? '-16px' : '-10px'};
  padding-left: 15px;
  padding-right: 15px;
`;

export default Div;
