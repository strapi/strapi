import React, { useEffect } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useGuidedTour } from '@strapi/helper-plugin/';
import GuidedTour from '../index';

describe('GuidedTour', () => {
  afterEach(() => {
    localStorage.removeItem('GUIDED_TOUR_CURRENT_STEP');
    localStorage.removeItem('GUIDED_TOUR_COMPLETED_STEPS');
  });

  it('should not crash', () => {
    const { container } = render(
      <GuidedTour>
        <div>Test</div>
      </GuidedTour>
    );

    expect(container.firstChild).toMatchInlineSnapshot(`
      <div>
        Test
      </div>
    `);
  });

  it('should update isGuidedTourVisible to true', () => {
    const Test = () => {
      const { setGuidedTourVisibility, isGuidedTourVisible } = useGuidedTour();

      useEffect(() => {
        setGuidedTourVisibility(true);
      }, [setGuidedTourVisibility]);

      return <div>{isGuidedTourVisible && <p>hello guided tour</p>}</div>;
    };

    render(
      <GuidedTour>
        <Test />
      </GuidedTour>
    );

    expect(screen.getByText('hello guided tour')).toBeInTheDocument();
  });

  it('should update isGuidedTourVisible to false', () => {
    const Test = () => {
      const { setGuidedTourVisibility, isGuidedTourVisible } = useGuidedTour();

      useEffect(() => {
        setGuidedTourVisibility(false);
      }, [setGuidedTourVisibility]);

      return <div>{isGuidedTourVisible && <p>hello guided tour</p>}</div>;
    };

    const { queryByText } = render(
      <GuidedTour>
        <Test />
      </GuidedTour>
    );

    expect(queryByText('hello guided tour')).not.toBeInTheDocument();
  });

  it('should update currentStep with setCurrentStep', () => {
    const Test = () => {
      const { setCurrentStep, currentStep, setSkipped } = useGuidedTour();

      useEffect(() => {
        setSkipped(false);
      }, [setSkipped]);

      return (
        <div>
          <button type="button" onClick={() => setCurrentStep('contentTypeBuilder.create')}>
            Update current step
          </button>
          {currentStep === 'contentTypeBuilder.create' && <p>Current step updated</p>}
        </div>
      );
    };

    const { queryByText } = render(
      <GuidedTour>
        <Test />
      </GuidedTour>
    );

    expect(queryByText('Current step updated')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Update current step'));

    expect(screen.getByText('Current step updated')).toBeInTheDocument();
  });

  it('should update guidedTourState with setStepState', () => {
    const Test = () => {
      const { setStepState, guidedTourState } = useGuidedTour();

      return (
        <div>
          <button type="button" onClick={() => setStepState('contentTypeBuilder.create', true)}>
            Update guided tour state
          </button>
          {guidedTourState && guidedTourState.contentTypeBuilder.create && (
            <p>Guided tour updated</p>
          )}
        </div>
      );
    };

    const { queryByText } = render(
      <GuidedTour>
        <Test />
      </GuidedTour>
    );

    expect(queryByText('Guided tour updated')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Update guided tour state'));

    expect(screen.getByText('Guided tour updated')).toBeInTheDocument();
  });

  it('should not update currentStep with startSection when section does not exist', () => {
    const Test = () => {
      const { startSection, currentStep } = useGuidedTour();

      useEffect(() => {
        startSection('failTest');
      }, [startSection]);

      return <div>{currentStep && <p>Hello world</p>}</div>;
    };

    const { queryByText } = render(
      <GuidedTour>
        <Test />
      </GuidedTour>
    );

    expect(queryByText('Hello world')).not.toBeInTheDocument();
  });

  it('should not update currentStep with startSection when first step of section is already done', () => {
    const Test = () => {
      const { startSection, currentStep, setStepState } = useGuidedTour();

      useEffect(() => {
        setStepState('contentTypeBuilder.create', true);
      }, [setStepState]);

      return (
        <div>
          {currentStep && <p>Hello world</p>}
          <button type="button" onClick={() => startSection('contentTypeBuilder')}>
            Start section
          </button>
        </div>
      );
    };

    const { queryByText } = render(
      <GuidedTour>
        <Test />
      </GuidedTour>
    );

    expect(queryByText('Hello world')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Start section'));

    expect(queryByText('Hello world')).not.toBeInTheDocument();
  });

  it('should not update currentStep with startSection when previous sections are not done', () => {
    const Test = () => {
      const { startSection, currentStep } = useGuidedTour();

      useEffect(() => {
        startSection('contentManager');
      }, [startSection]);

      return <div>{currentStep && <p>Hello world</p>}</div>;
    };

    const { queryByText } = render(
      <GuidedTour>
        <Test />
      </GuidedTour>
    );

    expect(queryByText('Hello world')).not.toBeInTheDocument();
  });

  it('should update currentStep with startSection when first step of section is not done', () => {
    const Test = () => {
      const { startSection, currentStep } = useGuidedTour();

      useEffect(() => {
        startSection('contentTypeBuilder');
      }, [startSection]);

      return <div>{currentStep && <p>Hello world</p>}</div>;
    };

    const { queryByText } = render(
      <GuidedTour>
        <Test />
      </GuidedTour>
    );

    expect(queryByText('Hello world')).toBeInTheDocument();
  });
});
