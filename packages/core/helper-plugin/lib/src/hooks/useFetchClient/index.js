import { useContext } from 'react';
import StrapiAppContext from '../../contexts/StrapiAppContext';

const useFetchClient = () => {
  const { fetchClient } = useContext(StrapiAppContext);

  return fetchClient;
};

export default useFetchClient;
