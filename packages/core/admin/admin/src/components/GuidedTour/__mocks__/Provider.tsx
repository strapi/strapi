const useGuidedTour = jest.fn((_name: string, getter: (state: any) => any) =>
  getter({
    isGuidedTourVisible: false,
    setCurrentStep: jest.fn(),
    startSection: jest.fn(),
    setSkipped: jest.fn(),
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

export { useGuidedTour };
