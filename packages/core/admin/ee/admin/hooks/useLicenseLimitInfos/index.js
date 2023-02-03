import { useContext } from 'react';
import { LicenseLimitInfosContext } from '../../contexts';

const useLicenseLimitInfos = () => {
  const context = useContext(LicenseLimitInfosContext);

  return context;
};

export default useLicenseLimitInfos;
