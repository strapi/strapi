import { useContext } from 'react';
import StrapiAppContext from '../../contexts/StrapiAppContext';

const useFetchClient = () => {
  const { getFetchClient } = useContext(StrapiAppContext);

  return getFetchClient();
};

export default useFetchClient;
