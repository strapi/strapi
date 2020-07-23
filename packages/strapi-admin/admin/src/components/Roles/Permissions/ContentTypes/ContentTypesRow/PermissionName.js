import styled from 'styled-components';
import PropTypes from 'prop-types';

const PermissionName = styled.div`
  display: flex;
  align-items: center;
  width: ${({ width }) => width};
`;

PermissionName.defaultProps = {
  width: '18rem',
};

PermissionName.propTypes = {
  width: PropTypes.string,
};

export default PermissionName;
