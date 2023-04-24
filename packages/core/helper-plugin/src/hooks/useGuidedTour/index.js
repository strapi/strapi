/**
 *
 * useGuidedTour
 *
 */

import { useContext } from 'react';
import GuidedTourContext from '../../contexts/GuidedTourContext';

const useGuidedTour = () => {
  const guidedTour = useContext(GuidedTourContext);

  return guidedTour;
};

export default useGuidedTour;
