import { useEffect, useState, useRef } from 'react';
import axios from 'axios';

const useFetch = () => {
  const isMounted = useRef(true);
  const [state, setState] = useState({
    error: false,
    isLoading: true,
    posts: [{ link: '1' }, { link: '2' }],
  });

  useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    const fetchData = async () => {
      try {
        const { data } = await axios.get(
          'https://strapi.io/api/blog-posts?_limit=2&_sort=publishedAt:desc',
          {
            cancelToken: source.token,
          }
        );

        const posts = data.reduce((acc, curr) => {
          acc.push({
            title: curr.seo.metaTitle,
            link: curr.slug,
            content: curr.seo.metaDescription,
          });

          return acc;
        }, []);

        setState({ isLoading: false, posts, error: false });
      } catch (err) {
        if (isMounted.current) {
          setState({ isLoading: false, error: true, posts: [] });
        }
      }
    };

    fetchData();

    return () => {
      isMounted.current = false;
      source.cancel('abort');
    };
  }, []);

  return state;
};

export default useFetch;
