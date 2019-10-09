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
