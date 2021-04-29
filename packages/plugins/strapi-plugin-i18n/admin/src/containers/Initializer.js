/**
 *
 * Initializer
 *
 */

import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import pluginId from '../pluginId';
import useLocales from '../hooks/useLocales';

const Initializer = ({ updatePlugin }) => {
  const { isLoading, locales } = useLocales();
  const ref = useRef();

  ref.current = updatePlugin;

  useEffect(() => {
    if (!isLoading && locales.length > 0) {
      ref.current(pluginId, 'isReady', true);
    }
  }, [isLoading, locales]);

  return null;
};

Initializer.propTypes = {
  updatePlugin: PropTypes.func.isRequired,
};

export default Initializer;
