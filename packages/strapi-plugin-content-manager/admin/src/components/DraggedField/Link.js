import styled from 'styled-components';

const Link = styled.div`
  position: absolute;
  bottom: 4px;
  left: 38px;
  font-weight: 400;
  color: #007eff;
  cursor: pointer;
  font-size: 13px;
  &:before {
    content: '\f013';
    margin-right: 7px;
    font-family: 'FontAwesome';
    font-size: 12px;
  }
`;

export default Link;
