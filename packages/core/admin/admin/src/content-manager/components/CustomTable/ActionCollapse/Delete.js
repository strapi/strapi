import styled from 'styled-components';

const Delete = styled.span`
  font-weight: 600;
  -webkit-font-smoothing: antialiased;
  &:after {
    content: '—';
    margin: 0 7px;
    font-size: 13px;
    font-weight: 600;
  }
`;

export default Delete;
