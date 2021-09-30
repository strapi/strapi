import PropTypes from 'prop-types';
import upperFirst from 'lodash/upperFirst';

const UpperFirst = ({ content }) => upperFirst(content);

UpperFirst.defaultProps = {
  content: null,
};

UpperFirst.propTypes = {
  content: PropTypes.string,
};

export default UpperFirst;
