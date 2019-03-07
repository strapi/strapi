import PropTypes from 'prop-types';

const propTypes = (params) => ({
  match: PropTypes.shape({
    isExact: PropTypes.bool,
    params: PropTypes.shape(params),
    path: PropTypes.string,
    url: PropTypes.string,
  }).isRequired,
});


export default propTypes;
