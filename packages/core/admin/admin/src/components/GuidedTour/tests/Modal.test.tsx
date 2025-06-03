import { render, screen } from '@tests/utils';

import { GuidedTourModal } from '../Modal';
import { GuidedTourProvider, useGuidedTour } from '../Provider';

const STATE = {
  isGuidedTourVisible: true,
  guidedTourState: {
    apiTokens: {
      create: false,
      success: false,
    },
    contentManager: {
      create: false,
      success: false,
    },
    contentTypeBuilder: {
      create: false,
      success: false,
    },
  },
  currentStep: 'contentTypeBuilder.create',
};

jest.mock('../Provider', () => ({
  ...jest.requireActual('../Provider'),
  useGuidedTour: jest.fn((_name: string, getter: (state: object) => any) => getter(STATE)),
}));

describe('<GuidedTourModal />', () => {
  it('should match the snapshot with contentTypeBuilder.create layout', async () => {
    render(
      <GuidedTourProvider>
        <GuidedTourModal />
      </GuidedTourProvider>
    );

    expect(screen.getByText('🧠 Create a first Collection type')).toBeInTheDocument();
  });

  it('should not render modal when no currentStep', () => {
    jest.mocked(useGuidedTour).mockImplementation((_name: string, getter: (state: any) => any) =>
      getter({
        isGuidedTourVisible: true,
        guidedTourState: {
          apiTokens: {
            create: false,
            success: false,
          },
          contentManager: {
            create: false,
            success: false,
          },
          contentTypeBuilder: {
            create: false,
            success: false,
          },
        },
        currentStep: null,
      })
    );

    const { queryByText } = render(<GuidedTourModal />);

    expect(queryByText('3 steps to get started')).not.toBeInTheDocument();
  });

  it('should not render modal when currentStep but isGuidedTourVisible is false', () => {
    jest.mocked(useGuidedTour).mockImplementation((_name: string, getter: (state: any) => any) =>
      getter({
        isGuidedTourVisible: false,
        guidedTourState: {
          apiTokens: {
            create: false,
            success: false,
          },
          contentManager: {
            create: false,
            success: false,
          },
          contentTypeBuilder: {
            create: false,
            success: false,
          },
        },
        currentStep: 'contentTypeBuilder.create',
      })
    );

    const { queryByText } = render(<GuidedTourModal />);

    expect(queryByText('3 steps to get started')).not.toBeInTheDocument();
  });
});
