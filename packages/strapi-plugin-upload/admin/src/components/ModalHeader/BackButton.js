/*
 *
 *
 * BackButton
 *
 */
import styled from 'styled-components';

const BackButton = styled.button`
  height: 5.9rem;
  width: 6.5rem;
  margin-right: 20px;
  margin-left: -30px;
  line-height: 6rem;
  text-align: center;
  color: #81848a;
  border-right: 1px solid #f3f4f4;
  &:before {
    line-height: normal;
    content: '\f053';
    font-family: 'FontAwesome';
    font-size: ${({ theme }) => theme.main.sizes.fonts.lg};
    font-weight: ${({ theme }) => theme.main.fontWeights.bold};
  }
  &:hover {
    background-color: #f3f4f4;
  }
  &:focus {
    outline: none;
  }
`;

export default BackButton;
