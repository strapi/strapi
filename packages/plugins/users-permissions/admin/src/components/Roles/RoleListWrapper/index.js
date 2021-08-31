import styled from 'styled-components';

const RoleListWrapper = styled.div`
  border-radius: 2px;
  box-shadow: 0 2px 4px #e3e9f3;
  background: white;

  > div,
  > div > div:last-of-type {
    box-shadow: none;
    border-radius: 2px;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
`;

export default RoleListWrapper;
