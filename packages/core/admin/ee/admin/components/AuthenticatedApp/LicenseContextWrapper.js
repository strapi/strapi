import React from 'react';
import { useQuery } from 'react-query';
import PropTypes from 'prop-types';
import { fetchLicenseLimitInfo } from './utils/api';
import { LicenseLimitInfosContext } from '../../contexts';

const LicenseContextWrapper = ({ children }) => {
  const { data: licenseLimitInfo } = useQuery('license-limit-info', fetchLicenseLimitInfo, {
    initialData: {},
  });

  return (
    <LicenseLimitInfosContext.Provider value={licenseLimitInfo}>
      {children}
    </LicenseLimitInfosContext.Provider>
  );
};

LicenseContextWrapper.propTypes = {
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired,
};

export default LicenseContextWrapper;
