import React from 'react';
import PropTypes from 'prop-types';
import TrackingContext from '../../contexts/TrackingContext';

const DEFAULT_VALUE = { uuid: false, telemetryProperties: undefined };

const TrackingProvider = (props) => {
  return <TrackingContext.Provider {...props} />;
};

TrackingProvider.propTypes = {
  value: PropTypes.shape({
    uuid: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
    telemetryProperties: PropTypes.object,
  }),
};

TrackingProvider.defaultProps = {
  value: DEFAULT_VALUE,
};

export default TrackingProvider;
