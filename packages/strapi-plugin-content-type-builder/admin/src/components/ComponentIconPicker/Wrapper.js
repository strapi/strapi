import styled from 'styled-components';
import { colors } from '@buffetjs/styles';
import PropTypes from 'prop-types';

/* eslint-disable indent */

const Wrapper = styled.div`
  min-height: 198px;
  .collection {
    background-color: #fafafb;
    ${({ error }) => {
      if (error) {
        return `
          border: 1px solid ${colors.darkOrange};
          border-radius: 2px;
        `;
      }

      return '';
    }}

    &:focus,
    :active {
      outline: 0;
    }
  }

  .noCells {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1em;
    color: #bdbdbd;
  }

  .search {
    display: flex;
    color: #919bae;
    > button {
      margin-top: -8px;
      font-size: 1.3rem;
      outline: 0;
    }
  }
`;

Wrapper.defaultProps = {
  error: false,
};

Wrapper.propTypes = {
  error: PropTypes.bool,
};

export default Wrapper;
