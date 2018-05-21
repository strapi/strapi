/**
 *
 * Div
 * This component uses styled-components library for styling
 *
 */

import styled from 'styled-components';

const Div = styled.div`
  margin-top: ${props => props.increaseMargin ? '10px': '-2px'};
  margin-bottom: 8px;
`;

export default Div;
