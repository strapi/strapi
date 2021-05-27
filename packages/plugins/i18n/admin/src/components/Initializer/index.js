/**
 *
 * Initializer
 *
 */

import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import pluginId from '../../pluginId';
import useLocales from '../../hooks/useLocales';

const Initializer = ({ setPlugin }) => {
  const { isLoading, locales } = useLocales();
  const ref = useRef();

  ref.current = setPlugin;

  useEffect(() => {
    if (!isLoading && locales.length > 0) {
      ref.current(pluginId);
    }
  }, [isLoading, locales]);

  return null;
};

Initializer.propTypes = {
  setPlugin: PropTypes.func.isRequired,
};

export default Initializer;
