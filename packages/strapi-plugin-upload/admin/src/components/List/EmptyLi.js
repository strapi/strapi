import styled from 'styled-components';

const EmptyLi = styled.li`
  height: 54px;
  background-color: #fff;
  padding-top: 5px;
  cursor: pointer;
  > div {
    display: flex;
    width: 100%;
    justify-content: center;
    padding-top: 1px;
    text-align: center;
    font-size: 12px;
    line-height: 54px;
    text-transform: uppercase;
  }
`;

export default EmptyLi;
