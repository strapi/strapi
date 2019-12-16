import styled from 'styled-components';

const ListButton = styled.div`
  button {
    background-color: #e6f0fb;
    width: 100%;
    height: 54px;
    border-top: 1px solid #aed4fb;
    color: #007eff;
    font-weight: 500;
    border-radius: 0;
    text-transform: uppercase;

    svg {
      vertical-align: initial;
    }
    &:hover {
      box-shadow: none;
    }
    &:focus {
      outline: 0;
    }
  }
`;

export default ListButton;
