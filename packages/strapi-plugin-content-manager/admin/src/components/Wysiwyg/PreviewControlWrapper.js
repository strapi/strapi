import styled from 'styled-components';

const PreviewControlWrapper = styled.div`
  display: flex;
  height: 49px;
  width: 100%;
  padding: 0 17px;
  justify-content: space-between;
  background-color: #fafafb;
  line-height: 30px;
  font-size: 12px;
  font-family: Lato;
  background-color: #fff;
  border-bottom: 1px solid #f3f4f4;
  line-height: 49px;
  font-size: 13px;
  > div:first-child {
    > span:last-child {
      font-size: 12px;
    }
  }
  cursor: pointer;

  .wysiwygCollapse {
    &:after {
      content: '\f066';
      font-family: FontAwesome;
      margin-left: 8px;
    }
  }
`;

export default PreviewControlWrapper;
