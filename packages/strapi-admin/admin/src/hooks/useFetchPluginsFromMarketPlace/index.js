import { useEffect, useState } from 'react';
import axios from 'axios';
import { useGlobalContext } from 'strapi-helper-plugin';

const useFetchPluginsFromMarketPlace = () => {
  const { currentLocale } = useGlobalContext();
  const [state, setState] = useState({
    error: false,
    isLoading: true,
    data: null,
  });

  useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    const getData = async () => {
      try {
        const { data } = await axios.get('https://marketplace.strapi.io/plugins', {
          cancelToken: source.token,
          params: { lang: currentLocale },
        });

        setState({
          isLoading: false,
          data,
          error: false,
        });
      } catch (err) {
        if (axios.isCancel(err)) {
          // Silent
        } else {
          // handle error
          setState(prev => ({ ...prev, isLoading: false, error: true }));
        }
      }
    };

    getData();

    return () => {
      source.cancel();
    };
  }, [currentLocale]);

  return state;
};

export default useFetchPluginsFromMarketPlace;
