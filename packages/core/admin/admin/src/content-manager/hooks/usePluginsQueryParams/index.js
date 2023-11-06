import { parse, stringify } from 'qs';
import { useLocation } from 'react-router-dom';

const usePluginsQueryParams = () => {
  const { search } = useLocation();
  const query = search ? parse(search.substring(1)) : {};

  return query.plugins ? stringify({ plugins: query.plugins }, { encode: false }) : '';
};

export default usePluginsQueryParams;
