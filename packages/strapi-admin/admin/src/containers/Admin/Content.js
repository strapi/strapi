import styled from 'styled-components';
import PropTypes from 'prop-types';

const Content = styled.div`
  min-height: calc(100vh - ${props => props.theme.main.sizes.header.height});
  width: calc(100vw - ${props => props.theme.main.sizes.leftMenu.width});
  margin-top: ${props => props.theme.main.sizes.header.height};
  margin-left: ${props => props.theme.main.sizes.leftMenu.width};
  background: ${props => props.theme.main.colors.content['background-alpha']};
`;

Content.defaultProps = {
  theme: {
    main: {
      colors: {
        content: {},
      },
      sizes: {
        header: {},
        leftMenu: {},
      },
    },
  },
};

Content.propTypes = {
  theme: PropTypes.object,
};

export default Content;
