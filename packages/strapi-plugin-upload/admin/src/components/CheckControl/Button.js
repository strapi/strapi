import styled from 'styled-components';
import Text from '../Text';

const Button = styled(Text)`
  display: flex;
  align-items: center;
  height: 36px;
  width: 280px;
  padding: 0 15px 0;
  color: ${({ theme }) => theme.main.colors.black};
  background-color: #fafafb;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  text-align: left;

  &:focus {
    outline: 0;
  }

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

  > svg {
    height: 2.1rem;
    margin-right: 15px;
    > g {
      fill: ${({ theme }) => theme.main.colors.grey};
    }
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
