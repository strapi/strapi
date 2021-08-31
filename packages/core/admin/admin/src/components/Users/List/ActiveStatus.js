import styled from 'styled-components';

const ActiveStatus = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:before {
    content: '';
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: ${({ isActive }) => (isActive ? '#38cd29' : '#f64d0a')};
  }
`;

export default ActiveStatus;
