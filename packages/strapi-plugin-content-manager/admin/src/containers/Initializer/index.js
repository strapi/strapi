/**
 *
 * Initializer
 *
 */

import { memo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { request } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';

const Initializer = ({ updatePlugin }) => {
  const ref = useRef();
  ref.current = updatePlugin;

  useEffect(() => {
    const getData = async () => {
      const requestURL = `/${pluginId}/content-types`;

      try {
        const { data } = await request(requestURL, { method: 'GET' });

        const menu = [
          {
            name: 'Content Types',
            links: data,
          },
        ];

        ref.current(pluginId, 'leftMenuSections', menu);
      } catch (err) {
        strapi.notification.error('content-manager.error.model.fetch');
      }
    };

    getData();
    ref.current(pluginId, 'isReady', true);

    return () => {};
  }, []);

  return null;
};

Initializer.propTypes = {
  updatePlugin: PropTypes.func.isRequired,
};

export default memo(Initializer);
