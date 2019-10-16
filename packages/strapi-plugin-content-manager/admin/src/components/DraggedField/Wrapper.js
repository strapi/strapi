import styled from 'styled-components';

const centered = `
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 28px;
`;

const Wrapper = styled.div`
  display: table-cell;
  height: 30px;
  padding: 0 5px;

  margin-right: 4px;

  .sub_wrapper {
    display: flex;
    height: 30px;
    padding-left: 10px;
    line-height: 30px;
    background: #fafafb;
    border: 1px solid #e3e9f3;
    border-radius: 2px;

    .name {
      flex-grow: 2;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: nowrap;
      cursor: pointer;
    }
    .grab {
      ${centered};
      margin-right: 10px;
      border-right: 1px solid #e9eaeb;
    }

    .remove {
      ${centered};
      width: 30px;
      text-align: center;
      background-color: #e9eaeb;
      cursor: pointer;

      svg {
        align-self: center;
      }
    }
  }
`;

export default Wrapper;
