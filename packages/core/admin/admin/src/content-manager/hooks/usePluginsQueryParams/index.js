import { useLocation } from 'react-router-dom';
import { parse, stringify } from 'qs';

const usePluginsQueryParams = () => {
  const { search } = useLocation();
  const query = search ? parse(search.substring(1)) : {};

  return query.plugins ? stringify({ plugins: query.plugins }, { encode: false }) : '';
};

export default usePluginsQueryParams;
