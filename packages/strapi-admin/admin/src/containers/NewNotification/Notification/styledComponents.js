import styled from 'styled-components';
import { Arrow } from '@buffetjs/icons';

const NotificationWrapper = styled.div`
  position: relative;
  border-top-right-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  border-bottom-right-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  margin-bottom: ${({ theme }) => theme.main.sizes.paddings.sm};
  box-shadow: 0 2px 4px 0 ${({ theme }) => theme.main.colors.darkGrey};
  background-color: ${props => props.theme.main.colors.white};
  border-left: 2px solid ${({ theme, color }) => theme.main.colors[color]};
  overflow: hidden;
  z-index: 10;
  color: ${({ color, theme }) => theme.main.colors[color]};
  transition: all 0.15s ease;
  width: 400px;
  min-height: 60px;

  &:hover {
    box-shadow: 0 1px 5px 0 rgba(0, 0, 0, 0.2);
  }
`;

const IconWrapper = styled.div`
  border: 1px solid;
  padding: 5px;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
`;

const LinkArrow = styled(Arrow)`
  transform: rotate(45deg);
  margin-top: 4px;
  color: ${({ theme }) => theme.main.colors.blue};
`;

const RemoveWrapper = styled.div`
  position: relative;
  display: flex;
  width: 20px;
  cursor: pointer;
  opacity: 0.6;
  font-size: 1.4rem;
  color: #bbc2bf;
  transition: opacity 0.1s ease;
  -webkit-font-smoothing: antialiased;

  &:hover {
    opacity: 1;
  }

  svg {
    margin: auto;
    font-size: 1.3rem;
    font-weight: 100 !important;
  }
`;

export { NotificationWrapper, IconWrapper, LinkArrow, RemoveWrapper };
