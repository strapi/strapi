import styled from 'styled-components';
import PropTypes from 'prop-types';

const Wrapper = styled.div`
  padding-top: 0.7rem;
  position: absolute;
  top: 60px;
  right: 0;
  bottom: 0;
  left: 0;
  overflow-y: auto;
  height: calc(100vh - (6rem + 10.2rem));
  box-sizing: border-box;

  .title {
    padding-left: 2rem;
    padding-right: 1.6rem;
    padding-top: 1rem;
    margin-bottom: 0.8rem;
    color: ${props => props.theme.main.colors.leftMenu['title-color']};
    text-transform: uppercase;
    font-size: 1.1rem;
    letter-spacing: 0.1rem;
    font-weight: 800;
  }

  .list {
    list-style: none;
    padding: 0;
    margin-bottom: 2rem;
  }

  .noPluginsInstalled {
    color: ${props => props.theme.main.colors.white};
    padding-left: 1.6rem;
    padding-right: 1.6rem;
    font-weight: 300;
    min-height: 3.6rem;
    padding-top: 0.9rem;
  }
`;

Wrapper.defaultProps = {
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

Wrapper.propTypes = {
  theme: PropTypes.object,
};

export default Wrapper;
