import PropTypes from 'prop-types';
import useFormatTimeStamp from '../../hooks/useFormatTimeStamp';

const CellValue = ({ type, value }) => {
  let formattedValue = value || '-';
  const formatTimeStamp = useFormatTimeStamp();

  if (type === 'date') {
    return formatTimeStamp(value);
  }

  return formattedValue;
};

CellValue.propTypes = {
  type: PropTypes.string.isRequired,
  value: PropTypes.any.isRequired,
};

export default CellValue;
