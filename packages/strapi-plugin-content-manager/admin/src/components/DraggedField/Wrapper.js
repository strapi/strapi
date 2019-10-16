import styled from 'styled-components';

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
      overflow: hidden;
      text-overflow: ellipsis;
      word-wrap: nowrap;
    }
    .grab {
      height: 28px;
      border-right: 1px solid black;

      svg {
        vertical-align: middle;
      }
    }
  }
`;

export default Wrapper;
