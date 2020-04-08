/**
 *
 * Initializer
 *
 */

import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { chain } from 'lodash';
import { request } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';

const Initializer = ({ updatePlugin }) => {
  const ref = useRef();
  ref.current = updatePlugin;

  useEffect(() => {
    const getData = async () => {
      // When updating this we also need to update the content-type-builder/admin/src/containers/DataManager/index.js => updateAppMenu
      // since it uses the exact same method...
      const requestURL = `/${pluginId}/content-types`;

      try {
        const { data } = await request(requestURL, { method: 'GET' });

        // Two things to know here:
        // First, we group content types by schema.kind to get an object with two separated content types (singleTypes, collectionTypes)
        // Then, we sort by name to keep collection types at the first position everytime.
        // As all content types are sorted by name, if a single type name starts with abc, the single types section will be at the first position.
        // However, we want to keep collection types at the first position in the admin menu
        ref.current(
          pluginId,
          'leftMenuSections',
          chain(data)
            .groupBy('schema.kind')
            .map((value, key) => ({ name: key, links: value }))
            .sortBy('name')
            .value()
        );
        ref.current(pluginId, 'isReady', true);
      } catch (err) {
        strapi.notification.error('content-manager.error.model.fetch');
      }
    };

    getData();
  }, []);

  return null;
};

Initializer.propTypes = {
  updatePlugin: PropTypes.func.isRequired,
};

export default Initializer;
