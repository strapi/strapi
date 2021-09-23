import styled from 'styled-components';

const ListButton = styled.div`
  button {
    width: 100%;
    height: 54px;
    border: 0;
    border-top: 1px solid #aed4fb;
    color: #007eff;
    font-weight: 500;
    text-transform: uppercase;
    background-color: #e6f0fb;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    border-bottom-left-radius: 2px;
    border-bottom-right-radius: 2px;
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
