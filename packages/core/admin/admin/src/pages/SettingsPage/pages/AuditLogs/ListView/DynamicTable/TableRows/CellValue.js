import PropTypes from 'prop-types';
import useFormatTimeStamp from '../../hooks/useFormatTimeStamp';

const CellValue = ({ type, value }) => {
  const formatTimeStamp = useFormatTimeStamp();

  if (type === 'date') {
    return formatTimeStamp(value);
  }

  return value || '-';
};

CellValue.propTypes = {
  type: PropTypes.string.isRequired,
  value: PropTypes.any.isRequired,
};

export default CellValue;
