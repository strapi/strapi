import styled from 'styled-components';
import Text from '../Text';

const Button = styled(Text)`
  height: 36px;
  width: 280px;
  padding-left: 15px;
  background-color: #fafafb;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  outline: 0;

  &:hover {
    height: 36px;
    background-color: ${({ theme }) => theme.main.colors.lightBlue};
    border: 1px solid ${({ theme }) => theme.main.colors.darkBlue};
    color: ${({ theme }) => theme.main.colors.mediumBlue};

    > svg {
      > g {
        fill: ${({ theme }) => theme.main.colors.darkBlue};
      }
    }
  }

  text-align: left;
  > svg {
    margin-right: 15px;
  }
`;

Button.defaultProps = {
  as: 'button',
  color: '#b4b6ba',
  fontSize: 'md',
  fontWeight: 'bold',
  type: 'button',
};

export default Button;
