import { useIsMobile } from '../../hooks/useMediaQuery';

import { GuidedTourContext } from './Context';

interface GuidedTourProviderProps {
  children: React.ReactNode;
}

export const GuidedTourProvider = ({ children }: GuidedTourProviderProps) => {
  const isMobile = useIsMobile();
  const isGuidedTourEnabled = process.env.NODE_ENV !== 'test' && !isMobile;

  return <GuidedTourContext enabled={isGuidedTourEnabled}>{children}</GuidedTourContext>;
};
