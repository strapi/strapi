import { useEffect, useState } from 'react';
import { request } from 'strapi-helper-plugin';

const useFetch = () => {
  const [state, setState] = useState({
    error: false,
    isLoading: true,
    posts: [{ link: '1' }, { link: '2' }],
  });

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;
    const fetchData = async () => {
      try {
        const response = await request(
          'https://blog.strapi.io/ghost/api/v0.1/posts/?client_id=ghost-frontend&client_secret=1f260788b4ec&limit=2',
          {
            method: 'GET',
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
            signal,
          },
          false,
          false,
          { noAuth: true }
        );
        const posts = response.posts.reduce((acc, curr) => {
          acc.push({
            title: curr.title,
            link: curr.slug,
            content: curr.meta_description,
          });

          return acc;
        }, []);

        setState({ isLoading: false, posts, error: false });
      } catch (err) {
        setState({ isLoading: false, error: true, posts: [] });
      }
    };

    fetchData();

    return () => {
      abortController.abort();
    };
  }, []);

  return state;
};

export default useFetch;
