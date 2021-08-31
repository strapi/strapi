/**
 *
 * useStrapiApp
 *
 */

import { useContext } from 'react';
import StrapiAppContext from '../../contexts/StrapiAppContext';

const useStrapiApp = () => useContext(StrapiAppContext);

export default useStrapiApp;
