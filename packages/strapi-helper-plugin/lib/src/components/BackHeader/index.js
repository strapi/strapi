/*
 *
 *
 * BackHeader
 *
 */
import styled from 'styled-components';

const BackHeader = styled.div`
  position: fixed;
  top: 0;
  height: 6rem;
  width: 6.5rem;
  line-height: 6rem;
  z-index: 1050;
  text-align: center;
  background-color: #ffffff;
  color: #81848a;
  border-top: 1px solid #f3f4f4;
  border-right: 1px solid #f3f4f4;
  border-left: 1px solid #f3f4f4;
  cursor: pointer;
  &:before {
    content: '\f053';
    font-family: 'FontAwesome';
    font-size: 1.8rem;
    font-weight: bolder;
  }
  &:hover {
    background-color: #f3f4f4;
  }
`;

export default BackHeader;
