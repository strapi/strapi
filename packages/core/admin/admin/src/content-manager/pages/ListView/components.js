import styled from 'styled-components';
import RemoveIcon from '../../assets/images/icon-cross-blue.svg';

const Wrapper = styled.div`
  padding-top: 1px;
`;

const Img = styled.img`
  height: 7px;
  margin: auto;
  margin-right: 0px;
  font-size: 12px;
`;

const FilterWrapper = styled.div`
  display: inline-block;
  height: 30px;
  margin-bottom: 6px;
  margin-right: 10px;
  padding: 0 10px;
  background: rgba(0, 126, 255, 0.08);
  border: 1px solid rgba(0, 126, 255, 0.24);
  border-radius: 2px;
  line-height: 28px;
  color: #007eff;
  font-size: 13px;

  > span {
    display: inline-block;
    margin-top: -1px;
  }

  > span:nth-child(2) {
    font-weight: 700;
  }

  > span:nth-child(3) {
    cursor: pointer;
  }

  -webkit-font-smoothing: antialiased;
`;

const Separator = styled.span`
  height: 30px;
  margin-left: 10px;
  margin-right: 10px;
  line-height: 30px;
  &:after {
    content: '';
    height: 15px;
    border-left: 1px solid #007eff;
    opacity: 0.1;
  }
`;

const Remove = styled.span`
  height: 28px;
  cursor: pointer;
  vertical-align: middle;

  &:after {
    display: inline-block;
    content: '';
    width: 8px;
    height: 8px;
    margin: auto;
    margin-top: -3px;
    background-image: url(${RemoveIcon});
  }
`;

export { Img, FilterWrapper, Separator, Remove, Wrapper };
