/**
 *
 * Initializer
 *
 */

import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import { request } from '@strapi/helper-plugin';
import pluginId from '../../pluginId';
import { setFileModelTimestamps } from './actions';

const Initializer = ({ setPlugin }) => {
  const ref = useRef();
  const dispatch = useDispatch();
  ref.current = setPlugin;

  useEffect(() => {
    const getData = async () => {
      const requestURL = '/content-manager/content-types';

      try {
        const { data } = await request(requestURL, { method: 'GET' });
        const fileModel = data.find(model => model.uid === 'plugins::upload.file');
        const timestamps = get(fileModel, ['options', 'timestamps']);

        // All connectors must initialise the "timestamps" option as a tuple
        if (!Array.isArray(timestamps) || timestamps.length !== 2) {
          throw new Error('Unexpected timestamp field configuration.');
        }

        dispatch(setFileModelTimestamps(timestamps));

        ref.current(pluginId);
      } catch (err) {
        strapi.notification.toggle({
          type: 'warning',
          message: { id: 'content-manager.error.model.fetch' },
        });
      }
    };

    getData();
  }, [dispatch]);

  return null;
};

Initializer.propTypes = {
  setPlugin: PropTypes.func.isRequired,
};

export default Initializer;
