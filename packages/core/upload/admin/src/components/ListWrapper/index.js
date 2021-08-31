import styled from 'styled-components';
import PropTypes from 'prop-types';

const ListWrapper = styled.div`
  margin-top: ${({ small }) => (small ? '2px' : '7px')};
`;

ListWrapper.defaultProps = {
  small: false,
};

ListWrapper.propTypes = {
  small: PropTypes.bool,
};

export default ListWrapper;
