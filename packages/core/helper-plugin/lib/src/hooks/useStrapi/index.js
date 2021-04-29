/**
 *
 * useStrapi
 *
 */

import { useContext } from 'react';
import StrapiContext from '../../contexts/StrapiContext';

const useStrapi = () => useContext(StrapiContext);

export default useStrapi;
