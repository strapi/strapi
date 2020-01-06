import styled from 'styled-components';
import PropTypes from 'prop-types';

const Li = styled.li`
  position: relative;
  overflow: hidden;

  &.dotted-link {
    background: red;
  }

  &:not(:first-child) {
    margin-top: 0;
  }

  .plugin {
    cursor: pointer;
    position: absolute;
    top: 10px;
    left: calc(100% - 4px);
    display: inline-block;
    width: auto;
    height: 20px;
    transition: right 1s ease-in-out;

    span {
      display: inline-block;
      overflow: hidden;
      width: auto;
      height: 20px;
      padding: 0 14px 0 10px;
      color: #ffffff;
      font-size: 12px;
      line-height: 20px;
      background: #0097f7;
      border-radius: 3px;
      transition: transform 0.3s ease-in-out;
      white-space: pre;

      &:hover {
        transform: translateX(calc(-100% + 9px));
      }
    }
  }

  .link {
    position: relative;
    padding-top: 0.8rem;
    padding-bottom: 0.2rem;
    padding-left: 1.6rem;
    min-height: 3.6rem;
    border-left: 0.3rem solid transparent;
    cursor: pointer;
    color: ${props => props.theme.main.colors.leftMenu['link-color']};
    text-decoration: none;
    display: block;
    -webkit-font-smoothing: antialiased;

    &:hover {
      color: ${props => props.theme.main.colors.white};
      background: ${props => props.theme.main.colors.leftMenu['link-hover']};

      border-left: 0.3rem solid ${props => props.theme.main.colors.strapi.blue};
      text-decoration: none;
    }

    &:focus {
      color: ${props => props.theme.main.colors.white};
      text-decoration: none;
    }

    &:visited {
      color: ${props => props.theme.main.colors.leftMenu['link-color']};
    }
    span {
      display: inline-block;
      width: 100%;
      padding-right: 1rem;
      padding-left: 2.6rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .linkActive {
    color: white !important;
    border-left: 0.3rem solid ${props => props.theme.main.colors.strapi.blue};
  }

  .linkIcon {
    position: absolute;
    top: calc(50% - 0.9rem + 0.5rem);
    left: 1.6rem;
    margin-right: 1.2rem;
    font-size: 1.4rem;
    width: 1.4rem;
    padding-bottom: 0.2rem;
    text-align: center;
  }

  .linkLabel {
    display: inline-block;
    width: 100%;
    padding-right: 1rem;
    padding-left: 2.6rem;
  }
`;

Li.defaultProps = {
  theme: {
    main: {
      colors: {
        leftMenu: {},
        strapi: {},
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
