import PropTypes from 'prop-types';

export const StageType = PropTypes.shape({
  uid: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
});
