import { GuidedTourHomepage } from '../../../components/GuidedTour/Homepage';
import { useGuidedTour } from '../../../components/GuidedTour/Provider';

export const GuidedTour = () => {
  const guidedTourState = useGuidedTour('HomePage', (state) => state.guidedTourState);
  const isGuidedTourVisible = useGuidedTour('HomePage', (state) => state.isGuidedTourVisible);
  const isSkipped = useGuidedTour('HomePage', (state) => state.isSkipped);
  const showGuidedTour =
    !Object.values(guidedTourState).every((section) =>
      Object.values(section).every((step) => step)
    ) &&
    isGuidedTourVisible &&
    !isSkipped;

  if (!showGuidedTour) {
    return null;
  }

  return <GuidedTourHomepage />;
};
