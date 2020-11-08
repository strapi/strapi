import styled from 'styled-components';
import { Button, FilterIcon as Filter } from 'strapi-helper-plugin';
import RemoveIcon from '../../assets/images/icon-cross-blue.svg';

const Wrapper = styled.div`
  padding-top: 1px;
`;

const FilterIcon = styled(Filter)`
  padding: 0 !important;
  margin: auto !important;
  > g {
    stroke: #282b2c;
  }
`;

const AddFilterCta = styled(Button)`
  display: flex;
  height: 30px;
  margin-right: 10px;
  padding: 0 10px;
  text-align: center;
  background-color: #ffffff;
  border: 1px solid #e3e9f3;
  border-radius: 2px;
  line-height: 28px;
  font-size: 13px;
  font-weight: 500;
  font-family: Lato;
  -webkit-font-smoothing: antialiased;
  cursor: pointer;
  &:hover {
    background: #f7f8f8;
  }
  &:focus,
  &:active {
    outline: 0;
  }
  > span {
    margin-left: 10px;
  }
`;

const Img = styled.img`
  height: 7px;
  margin: auto;
  margin-right: 0px;
  font-size: 12px;
`;

const FooterWrapper = styled.div`
  padding-top: 3rem;
`;

const Label = styled.label`
  display: inline-block;
  height: 32px;
  margin-left: 10px;
  line-height: 32px;
  color: #787e8f;
  font-size: 13px;
  font-style: italic;
`;

const SelectWrapper = styled.div`
  display: flex;
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

export {
  AddFilterCta,
  FilterIcon,
  FooterWrapper,
  Img,
  Label,
  SelectWrapper,
  FilterWrapper,
  Separator,
  Remove,
  Wrapper,
};
