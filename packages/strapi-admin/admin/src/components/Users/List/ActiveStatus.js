import styled from 'styled-components';

const ActiveStatus = styled.div`
  &:before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-top: 3px;
    margin-right: 10px;
    border-radius: 50%;
    background-color: ${({ isActive }) => (isActive ? '#38cd29' : '#f64d0a')};
  }
`;

export default ActiveStatus;
