import styled from 'styled-components';

const Button = styled.div`
  width: 100%;
  height: 34px;
  text-align: center;
  background-color: #fafafb;
  border-radius: 2px;
  border-bottom-left-radius: 2px;
  border-bottom-right-radius: 2px;

  color: #333740;
  font-size: 12px;
  font-weight: 700;
  -webkit-font-smoothing: antialiased;
  line-height: 35px;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  > i {
    margin-right: 10px;
  }
`;

const Flex = styled.div`
  display: flex;
  > button {
    cursor: pointer;
    padding-top: 0;
  }
`;

const GroupCollapseWrapper = styled(Flex)`
  height: 34px;
  margin-bottom: 2px;
  padding: 0 20px;
  justify-content: space-between;
  line-height: 34px;
  background-color: #ffffff;
  font-size: 13px;
  border-radius: 2px;
  button,
  i,
  img {
    &:active,
    &:focus {
      outline: 0;
    }
  }
`;

const ImgWrapper = styled.div`
  width: 21px;
  height: 21px;
  margin: auto;
  margin-right: 19px;
  border-radius: 50%;
  background-color: #e3e9f3;
  text-align: center;
  line-height: 21px;

  ${({ isOpen }) => !isOpen && 'transform: rotate(180deg)'}
`;

export { Button, Flex, GroupCollapseWrapper, ImgWrapper };
