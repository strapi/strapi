import { GuidedTourContext } from './Context';

interface GuidedTourProviderProps {
  children: React.ReactNode;
}

export const GuidedTourProvider = ({ children }: GuidedTourProviderProps) => {
  const isGuidedTourEnabled = process.env.NODE_ENV !== 'test';

  return <GuidedTourContext enabled={isGuidedTourEnabled}>{children}</GuidedTourContext>;
};
