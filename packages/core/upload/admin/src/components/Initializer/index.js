/**
 *
 * Initializer
 *
 */

import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import pluginId from '../../pluginId';

// TODO use the models API and remove this component
const Initializer = ({ setPlugin }) => {
  const ref = useRef();
  ref.current = setPlugin;

  // TODO: remove
  useEffect(() => {
    ref.current(pluginId);
  }, []);

  return null;
};

Initializer.propTypes = {
  setPlugin: PropTypes.func.isRequired,
};

export default Initializer;
