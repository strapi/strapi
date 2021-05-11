/**
 *
 * Initializer
 *
 */

import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { request } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';

const Initializer = ({ setPlugin }) => {
  const ref = useRef();
  ref.current = setPlugin;

  useEffect(() => {
    const getData = async () => {
      const requestURL = '/content-manager/content-types';

      try {
        const { data } = await request(requestURL, { method: 'GET' });
        const fileModel = data.find(model => model.uid === 'plugins::upload.file');

        ref.current(pluginId, 'fileModel', fileModel);
        ref.current(pluginId, 'isReady', true);
      } catch (err) {
        strapi.notification.toggle({
          type: 'warning',
          message: { id: 'content-manager.error.model.fetch' },
        });
      }
    };

    getData();
  }, []);

  return null;
};

Initializer.propTypes = {
  setPlugin: PropTypes.func.isRequired,
};

export default Initializer;
