import upperFirst from 'lodash/upperFirst';
import PropTypes from 'prop-types';

const UpperFirst = ({ content }) => upperFirst(content);

UpperFirst.defaultProps = {
  content: null,
};

UpperFirst.propTypes = {
  content: PropTypes.string,
};

export default UpperFirst;
