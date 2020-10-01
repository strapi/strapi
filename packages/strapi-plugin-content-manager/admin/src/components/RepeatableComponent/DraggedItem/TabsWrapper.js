import styled from 'styled-components';

const TabsWrapper = styled.div`
  .tabs {
    margin: 0;
    padding: 0;
    background-color: #fff;
    border: 0px;
  }
  .tabs li {
    display: inline-block;
  }
  .tabs li button {
    display: block;
    padding: 7px 17px;
    outline: none;

    &:before {
      content: '▶ ';
      color: #95a6b1;
      opacity: 0.4;
    }
  }
  .tabs li.selected button {
    background-color: rgb(247, 248, 248);
    text-decoration: none;
    font-weight: 600;

    &:before {
      content: '▼ ';
      color: #95a6b1;
      opacity: 1;
    }
  }
  .tabs li button:hover {
    background-color: #fafafa;
    cursor: pointer;
  }
  .tabs li.has-error button {
    color: rgb(246, 77, 10);
    background-color: rgb(255, 233, 224);
  }
  .tabs li.has-error button.selected,
  .tabs li.has-error button:hover {
    background-color: rgb(255, 241, 236);
  }
  .tabs li.has-error button:after {
    content: ' *';
  }
  .hidden {
    display: none;
  }
  .component {
    background-color: rgb(247, 248, 248);
  }

  .wrapper {
    border-top: 1px solid rgb(230, 230, 230);
  }

  .sub-wrapper {
    width: 100%;
  }
`;

export default TabsWrapper;
