import styled from 'styled-components';
import PropTypes from 'prop-types';

const CardControlsWrapper = styled.div`
  display: flex;
  position: absolute;
  top: 0;
  ${({ leftAlign }) => (leftAlign ? 'left: 0' : 'right: 0')};
  width: fit-content;
  height: auto;
  margin: 10px;
`;

CardControlsWrapper.defaultProps = {
  leftAlign: false,
};

CardControlsWrapper.propTypes = {
  leftAlign: PropTypes.bool,
};

export default CardControlsWrapper;
