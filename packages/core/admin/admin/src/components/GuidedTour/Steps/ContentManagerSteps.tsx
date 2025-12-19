import { useParams } from 'react-router-dom';

import { CompletedActions, useGuidedTour } from '../Context';
import { tours, type StepContentProps } from '../Tours';
import { GUIDED_TOUR_REQUIRED_ACTIONS } from '../utils/constants';

import { DefaultActions, DefaultActionsProps, GotItAction, StepCount } from './Step';

const ContentManagerActions = ({
  isActionRequired = false,
  ...props
}: Omit<DefaultActionsProps, 'tourName'> & {
  isActionRequired?: boolean;
}) => {
  const { collectionType } = useParams();

  const state = useGuidedTour('ContentManagerActions', (s) => s.state);
  const dispatch = useGuidedTour('ContentManagerActions', (s) => s.dispatch);

  const isSingleType = collectionType === 'single-types';

  const currentStepOffset = state.tours.contentManager.currentStep + 1;
  const displayedCurrentStep = (() => {
    if (isSingleType && currentStepOffset > collectionTypeSpecificSteps.length) {
      return currentStepOffset - collectionTypeSpecificSteps.length;
    }

    return currentStepOffset;
  })();

  // For single types we subtract all contentTypeSpecificSteps
  const displayedTourLength = isSingleType
    ? tours.contentManager._meta.displayedStepCount - collectionTypeSpecificSteps.length
    : tours.contentManager._meta.displayedStepCount;

  const handleNextStep = () => {
    if (isSingleType && state.tours.contentManager.currentStep === 0) {
      // The tours diverge after the first step, on next click skip all the collection type specific steps
      dispatch({
        type: 'go_to_step',
        payload: { tourName: 'contentManager', step: collectionTypeSpecificSteps.length + 1 },
      });
    } else {
      dispatch({
        type: 'next_step',
        payload: 'contentManager',
      });
    }
  };

  const handlePreviousStep = () => {
    if (
      isSingleType &&
      // Check the currentStep is the step after the collection type specific steps
      state.tours.contentManager.currentStep === collectionTypeSpecificSteps.length + 1
    ) {
      dispatch({
        type: 'go_to_step',
        payload: {
          tourName: 'contentManager',
          // Go to the step just before the collection type specific steps
          step: state.tours.contentManager.currentStep - collectionTypeSpecificSteps.length - 1,
        },
      });
    } else {
      dispatch({
        type: 'previous_step',
        payload: 'contentManager',
      });
    }
  };

  if (isActionRequired) {
    return (
      <>
        <StepCount
          tourName="contentManager"
          displayedCurrentStep={displayedCurrentStep}
          displayedTourLength={displayedTourLength}
        />
        <GotItAction onClick={handleNextStep} />
      </>
    );
  }

  return (
    <>
      <StepCount
        tourName="contentManager"
        displayedCurrentStep={displayedCurrentStep}
        displayedTourLength={displayedTourLength}
      />
      <DefaultActions
        tourName="contentManager"
        onNextStep={handleNextStep}
        onPreviousStep={handlePreviousStep}
        {...props}
      />
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Step Components
 * -----------------------------------------------------------------------------------------------*/

const Introduction = ({ Step }: StepContentProps) => {
  return (
    <Step.Root side="top" sideOffset={33} withArrow={false}>
      <Step.Title id="tours.contentManager.Introduction.title" defaultMessage="Content manager" />
      <Step.Content
        id="tours.contentManager.Introduction.content"
        defaultMessage="Create and manage content from your collection types and single types."
      />
      <Step.Actions>
        <ContentManagerActions showSkip />
      </Step.Actions>
    </Step.Root>
  );
};

const CreateNewEntry = ({ Step }: StepContentProps) => {
  return (
    <Step.Root side="bottom" align="end">
      <Step.Title
        id="tours.contentManager.CreateNewEntry.title"
        defaultMessage="Create new entry"
      />
      <Step.Content
        id="tours.contentManager.CreateNewEntry.content"
        defaultMessage='Click the "Create new entry" button to create and publish a new entry for this collection type.'
      />
      <Step.Actions>
        <ContentManagerActions showPrevious />
      </Step.Actions>
    </Step.Root>
  );
};

const Fields = ({ Step }: StepContentProps) => (
  <Step.Root sideOffset={-12}>
    <Step.Title id="tours.contentManager.Fields.title" defaultMessage="Fields" />
    <Step.Content
      id="tours.contentManager.Fields.content"
      defaultMessage="First, fill in the fields you created in the Content-Type Builder."
    />
    <Step.Actions>
      <ContentManagerActions showPrevious />
    </Step.Actions>
  </Step.Root>
);

const Publish = ({ Step }: StepContentProps) => (
  <Step.Root side="left" align="center">
    <Step.Title id="tours.contentManager.Publish.title" defaultMessage="Publish" />
    <Step.Content
      id="tours.contentManager.Publish.content"
      defaultMessage='Then click the "Publish" button to make your content available through the content API.'
    />
    <Step.Actions>
      <ContentManagerActions isActionRequired />
    </Step.Actions>
  </Step.Root>
);

const Finish = ({ Step }: StepContentProps) => (
  <Step.Root side="right">
    <Step.Title
      id="tours.contentManager.FinalStep.title"
      defaultMessage="Time to setup API tokens!"
    />
    <Step.Content
      id="tours.contentManager.FinalStep.content"
      defaultMessage="Now that you've created and published an entry, let's setup an API token to manage access to your content."
    />
    <Step.Actions showStepCount={false} showPrevious={false} to="/settings/api-tokens" />
  </Step.Root>
);

/* -------------------------------------------------------------------------------------------------
 * Steps
 * -----------------------------------------------------------------------------------------------*/
const collectionTypeSpecificSteps = [
  {
    name: 'CreateNewEntry',
    content: CreateNewEntry,
  },
];

export const contentManagerSteps = [
  {
    name: 'Introduction',
    when: (completedActions: CompletedActions) =>
      completedActions.includes(GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema),
    content: Introduction,
  },
  ...collectionTypeSpecificSteps,
  {
    name: 'Fields',
    content: Fields,
  },
  {
    name: 'Publish',
    content: Publish,
  },
  {
    name: 'Finish',
    content: Finish,
    excludeFromStepCount: true,
    when: (completedActions: CompletedActions) =>
      completedActions.includes(GUIDED_TOUR_REQUIRED_ACTIONS.contentManager.createContent),
  },
] as const;
