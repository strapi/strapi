import styled from 'styled-components';
import PropTypes from 'prop-types';
import { themePropTypes } from 'strapi-helper-plugin';

const Label = styled.label`
  position: relative;
  height: 203px;
  width: 100%;
  margin-top: 36px;
  margin-bottom: 18px;
  padding-top: 46px;
  text-align: center;
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  border: 2px dashed ${({ theme }) => theme.main.colors.darkGrey};
  background-color: ${({ theme }) => theme.main.colors.lightGrey};

  .dragzone {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
  }

  ${({ isDragging }) =>
  isDragging &&
    `
      background-color: rgba(28, 93, 231, 0.01);
      border: 2px dashed rgba(28, 93, 231, 0.1);
    `}
`;

Label.defaultProps = {
  isDragging: false,
};

Label.propTypes = {
  ...themePropTypes,
  isDragging: PropTypes.bool,
};

export default Label;
