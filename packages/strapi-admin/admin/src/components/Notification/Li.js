import styled, { createGlobalStyle } from 'styled-components';
import { themePropTypes } from 'strapi-helper-plugin';

const GlobalNotification = createGlobalStyle`
  .notificationIcon {
    position: relative;
    display: block;
    width: 40px;
    height: 40px;
    > div {
      position: absolute;
      width: 20px;
      height: 20px;
      top: 10px;
      left: 5px;
      border-radius: 10px;
      border: 1px solid ${props => props.theme.main.colors.green};
      display: flex;
      svg {
        margin: auto;
        color: ${props => props.theme.main.colors.green};
        width: 10px;
        height: 10px;
      }
    }
  }

  .notificationContent {
    display: flex;
    align-items: center;
    width: 220px;
    margin: 0;
    padding-right: 10px;
    border-right: 1px solid rgba(255, 255, 255, 0.3);
  }

  .notificationTitle {
    margin-bottom: 0;
    font-size: 1.4rem;
    font-weight: 400;
    line-height: 1.8rem;
  }

  .notificationClose {
    position: relative;
    display: flex;
    width: 20px;
    margin-right: 15px;
    cursor: pointer;
    opacity: 0.6;
    font-size: 1.4rem;
    color: #BBC2BF;
    transition: opacity 0.1s ease;
    -webkit-font-smoothing: antialiased;

    &:hover {
      opacity: 1;
    }

    svg {
      margin: auto;
      font-size: 1.3rem;
      font-weight: 100!important;
    }
  }

  .notificationSuccess{
    .notificationIcon {
      div {
        border-color: ${props => props.theme.main.colors.green};
      } 
      svg {
        color: ${props => props.theme.main.colors.green};
      }
    } 
  }

  .notificationWarning {
    .notificationIcon {
      div {
        border-color: ${props => props.theme.main.colors.orange};
      } 
      svg {
        color: ${props => props.theme.main.colors.orange};
      }
    } 
  }

  .notificationError {
    .notificationIcon {
      div {
        border-color: ${props => props.theme.main.colors.red};
      } 
      svg {
        color: ${props => props.theme.main.colors.red};
      }
    } 
  }

  .notificationInfo {
    .notificationIcon {
      div {
        border-color: ${props => props.theme.main.colors.blue};
      } 
      svg {
        color: ${props => props.theme.main.colors.blue};
      }
    } 
  }
`;

const Li = styled.li`
  position: relative;
  display: flex;
  align-items: center;
  width: 300px;
  min-height: 60px;
  margin-bottom: 14px;
  background: ${props => props.theme.main.colors.white};
  border-radius: 2px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.15);
  color: #333740;
  transition: all 0.15s ease;
  overflow: hidden;
  z-index: 10;
  padding: 1rem;
  border-left: 2px solid ${props => props.theme.main.colors.green};
  &.notificationError {
    border-color: ${props => props.theme.main.colors.red};
  }
  &.notificationWarning {
    border-color: ${props => props.theme.main.colors.orange};
  }
  &.notificationInfo {
    border-color: ${props => props.theme.main.colors.blue};
  }

  &:last-child {
    z-index: 1;
  }

  &:hover {
    cursor: pointer;
    box-shadow: 0 1px 5px 0 rgba(0, 0, 0, 0.2);
  }
`;

Li.defaultProps = {
  theme: {
    main: {
      colors: {
        leftMenu: {},
      },
      sizes: {
        header: {},
        leftMenu: {},
      },
    },
  },
};

Li.propTypes = {
  ...themePropTypes,
};

export default Li;

export { GlobalNotification };
