import { useState, useEffect } from 'react';
import { request } from 'strapi-helper-plugin';

const useFetchRole = id => {
  const [data, setData] = useState({});
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    fetchRole();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRole = async () => {
    try {
      const { data } = await request(`/admin/roles/${id}`, { method: 'GET' });

      setData(data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      strapi.notification.error('notification.error');
    }
  };

  return { data, isLoading };
};

export default useFetchRole;
