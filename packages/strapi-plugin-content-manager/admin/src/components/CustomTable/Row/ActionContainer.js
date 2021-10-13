import styled from 'styled-components';

const ActionContainer = styled.td`
  text-align: right;

  i,
  svg {
    margin-left: 15px;
    font-size: 1rem;

    color: #333740;

    &:first-of-type {
      margin-left: 0px;
    }
  }
`;

export default ActionContainer;
