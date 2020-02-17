import styled from 'styled-components';
import PropTypes from 'prop-types';

const Label = styled.label`
  position: relative;
  height: 204px;
  width: 100%;
  padding-top: 46px;
  border: 2px dashed #e3e9f3;
  border-radius: 2px;
  text-align: center;

  .dragzone {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
  }

  ${({ isDragging }) => {
    if (isDragging) {
      return `
        background-color: rgba(28, 93, 231, 0.01) !important;
        border: 2px dashed rgba(28, 93, 231, 0.1) !important;
      `;
    }

    return '';
  }}
`;

Label.defaultProps = {
  isDragging: false,
};

Label.propTypes = {
  isDragging: PropTypes.bool,
};

export default Label;
