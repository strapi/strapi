import styled from 'styled-components';
import PropTypes from 'prop-types';

const Wrapper = styled.div`
  padding-top: 0.7rem;
  position: absolute;
  top: ${props => props.theme.main.sizes.leftMenu.height};
  right: 0;
  bottom: 0;
  left: 0;
  overflow-y: auto;
  height: calc(100vh - (${props => props.theme.main.sizes.leftMenu.height} + 10.2rem));
  box-sizing: border-box;
  // I am keeping these lines if we want to join the scrollbars again
  // display: flex;
  // flex-direction: column;

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
    &.models-list {
      li a svg {
        font-size: 0.74rem;
        top: calc(50% - 0.35rem);
      }
    }
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
