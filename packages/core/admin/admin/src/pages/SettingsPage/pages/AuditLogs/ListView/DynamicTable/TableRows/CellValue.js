import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import useFormatTimeStamp from '../../hooks/useFormatTimeStamp';
import getDefaultMessage from '../../utils/getActionTypesDefaultMessages';

const CellValue = ({ type, value }) => {
  const formatTimeStamp = useFormatTimeStamp();
  const { formatMessage } = useIntl();

  if (type === 'date') {
    return formatTimeStamp(value);
  }

  if (type === 'action') {
    return formatMessage({
      id: `Settings.permissions.auditLogs.${value}`,
      defaultMessage: getDefaultMessage(value),
    });
  }

  return value || '-';
};

CellValue.propTypes = {
  type: PropTypes.string.isRequired,
  value: PropTypes.any.isRequired,
};

export default CellValue;
