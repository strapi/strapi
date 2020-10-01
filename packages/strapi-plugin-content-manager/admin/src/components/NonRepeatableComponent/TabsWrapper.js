import styled from 'styled-components';

const TabsWrapper = styled.div`
  .tabs {
    margin: 0;
    padding: 0;
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

  .sub-wrapper {
    /* background-color: #fff; */
    margin-bottom: 25px;
  }
  .sub-wrapper .tabs-container {
    border: solid 1px #e2e2e2;
    background-color: #fff;
  }
  .sub-wrapper .tabs {
    border-bottom: solid 1px #efefef;
  }
  .sub-wrapper .tabs li.selected a {
    background-color: #f7f8f8;
  }
  .sub-wrapper .tabs li.has-error a {
    background-color: rgb(255, 241, 236);
  }
  .sub-wrapper .wrapper {
    background-color: #fff;
  }
  .sub-wrapper .wrapper .component {
    background-color: #fff;
  }

  .col-12 > label {
    display: none;
  }
  .col-12 > div > label {
    display: none;
  }

  .hidden {
    display: none;
  }
  .component {
    background-color: rgb(247, 248, 248);
  }
`;

export default TabsWrapper;
