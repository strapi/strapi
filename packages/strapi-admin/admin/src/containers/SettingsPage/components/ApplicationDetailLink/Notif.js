import styled from 'styled-components';

const Notif = styled.div`
  margin: auto;
  margin-right: 15px;

  &:before {
    content: '';
    display: flex;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #007dff;
  }
`;

export default Notif;
