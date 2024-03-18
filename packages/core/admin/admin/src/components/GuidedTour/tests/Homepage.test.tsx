import { render, screen } from '@tests/utils';

import { GuidedTourHomepage } from '../Homepage';
import { useGuidedTour } from '../Provider';

const STATE = {
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
};

jest.mock('../Provider', () => ({
  ...jest.requireActual('../Provider'),
  useGuidedTour: jest.fn((_name: string, getter: (state: object) => any) => getter(STATE)),
}));

describe('Homepage', () => {
  it('should show guided tour when guided tour not complete', () => {
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
      })
    );

    render(<GuidedTourHomepage />);

    expect(screen.getByText('🧠 Build the content structure')).toBeInTheDocument();
  });

  it("shouldn't show guided tour when guided tour is completed", () => {
    jest.mocked(useGuidedTour).mockImplementation((_name: string, getter: (state: any) => any) =>
      getter({
        isGuidedTourVisible: true,
        guidedTourState: {
          apiTokens: {
            create: true,
            success: true,
          },
          contentManager: {
            create: true,
            success: true,
          },
          contentTypeBuilder: {
            create: true,
            success: true,
          },
        },
      })
    );

    const { queryByText } = render(<GuidedTourHomepage />);

    expect(queryByText('Build the content structure')).not.toBeInTheDocument();
  });

  it("shouldn't show guided tour when guided tour is skipped", () => {
    jest.mocked(useGuidedTour).mockImplementation((_name: string, getter: (state: any) => any) =>
      getter({
        isSkipped: true,
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
      })
    );

    const { queryByText } = render(<GuidedTourHomepage />);

    expect(queryByText('Build the content structure')).not.toBeInTheDocument();
  });
});
