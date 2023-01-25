/**
 *
 * Wrapper
 *
 */

import styled from 'styled-components';
import PropTypes from 'prop-types';

const Wrapper = styled.div`
  position: fixed;
  float: left;
  top: 0;
  left: 0;
  height: 100vh;
  width: ${props => props.theme.main.sizes.leftMenu.width};
  background: ${props => props.theme.main.colors.strapi['blue-darker']};
  padding: 0 5px 0 0;

  /* scrollbar overrides */
  * {
    ::-webkit-scrollbar {
      width: 7px;
    }

    ::-webkit-scrollbar-track,
    ::-webkit-scrollbar-track:hover {
      background-color: transparent;
    }

    ::-webkit-scrollbar-thumb {
      background-color: ${props => props.theme.main.colors.leftMenu['title-color']};
    }

    ::-webkit-scrollbar-thumb:hover {
      background-color: ${props => props.theme.main.colors.leftMenu['link-color']};
    }

    /* firefox */
    scrollbar-color: ${props => props.theme.main.colors.leftMenu['title-color']} transparent;
  }

  .menu {
    height: 80vh;
    margin-top: 5px;  
    .menu-section {
      h5 {
        text-transform: uppercase;
        color: var(--gray);
        margin-bottom: 10px;
        cursor: pointer;
        padding-left: 24px;
        font-weight: bold;
      }
      margin-bottom: 20px;
      li {
        padding-left:13px;
      }
    }
    .submenu-section {
      h5 {       
        padding-left: 35px;    
      }    
      li {
        padding-left:25px;
      } 
    }

    ul {
      margin: 0;
      padding: 0;
      list-style: none;     
    }

    overflow-y: auto;
  }

  .logo {
    img {
      width: 180px;
    }
    padding: 12px;
  }

  .icons {
    position: absolute;
    bottom: 20px;
    left: 0;
    text-align: center;
    z-index: 10;
    width: 100%;

    ul {
      margin: 0;
      padding: 0;
      list-style: none;
      color: white;

      li {
        display: inline-block;
        margin: 0 8px;

        a {
          color: var(--gray)
        }

        a:hover {
          color: var(--white)
          text-decoration: none;
        }
      }
    }
  }
`;

Wrapper.defaultProps = {
  theme: {
    main: {
      colors: {
        strapi: {},
      },
      sizes: {
        header: {},
        leftMenu: {},
      },
    },
  },
};

Wrapper.propTypes = {
  theme: PropTypes.object,
};

export default Wrapper;
