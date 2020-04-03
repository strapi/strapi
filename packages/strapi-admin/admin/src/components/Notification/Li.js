import styled, { createGlobalStyle } from 'styled-components';
import PropTypes from 'prop-types';

const GlobalNotification = createGlobalStyle`
.notificationIcon {
  position: relative;
  display: block;
  width: 60px;
  height: 60px;
  > div {
    position: absolute;
    width: 20px;
    height: 20px;
    top: 20px; left:20px;
    border-radius: 10px;
    border: 1px solid ${props => props.theme.main.colors.green};
    display: flex;
    i, svg {
      margin: auto;
      font-size: 1.2rem;
      color: ${props => props.theme.main.colors.green};
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
  cursor: pointer;
  opacity: 0.6;
  position: relative;
  display: flex;
  width: 20px;
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
  background: linear-gradient(100deg , #FFFFFF 50%, rgba(39, 183, 15, .05)), ${props =>
    props.theme.main.colors.white};
}

.notificationWarning {
  background: linear-gradient(100deg , #FFFFFF 50%, rgba(250, 156, 0, .05)), ${props =>
    props.theme.main.colors.white};

  .notificationIcon:before {
    padding-top: 4px;
    border-color: ${props => props.theme.main.colors.orange};
    color: ${props => props.theme.main.colors.orange};
  }
}

.notificationError {
  background: linear-gradient(100deg , #FFFFFF 50%, rgba(255, 93, 0, .05)), $white;

  .notificationIcon:before {
    padding-top: 4px;
    border-color: $brand-danger; // red
    border-color: ${props => props.theme.main.colors.red};
    color: ${props => props.theme.main.colors.red};
  }
}

.notificationInfo {
  background: linear-gradient(100deg , #FFFFFF 50%, rgba(28, 93, 231, .05)), ${props =>
    props.theme.main.colors.white};

  .notificationIcon:before {
    border-color: ${props => props.theme.main.colors.blue};
    color: ${props => props.theme.main.colors.blue};
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

  // The last notification must appear from
  // the background of the previous one.
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
  theme: PropTypes.object,
};

export default Li;

export { GlobalNotification };
