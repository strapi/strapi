import { CompletedActions } from '../Context';
import { type StepContentProps } from '../Tours';
import { GUIDED_TOUR_REQUIRED_ACTIONS } from '../utils/constants';

import { GotItAction, StepCount } from './Step';

/* -------------------------------------------------------------------------------------------------
 * Step Components
 * -----------------------------------------------------------------------------------------------*/

const Introduction = ({ Step }: StepContentProps) => (
  <Step.Root side="top" withArrow={false}>
    <Step.Title id="tours.contentManager.Introduction.title" defaultMessage="Content manager" />
    <Step.Content
      id="tours.contentManager.Introduction.content"
      defaultMessage="Create and manage content from your collection types and single types."
    />
    <Step.Actions showSkip />
  </Step.Root>
);

const Fields = ({ Step }: StepContentProps) => (
  <Step.Root sideOffset={-12}>
    <Step.Title id="tours.contentManager.Fields.title" defaultMessage="Fields" />
    <Step.Content
      id="tours.contentManager.Fields.content"
      defaultMessage="Fill in the fields with content you want to publish."
    />
    <Step.Actions />
  </Step.Root>
);

const Publish = ({ Step, dispatch }: StepContentProps) => (
  <Step.Root side="left" align="center">
    <Step.Title id="tours.contentManager.Publish.title" defaultMessage="Publish" />
    <Step.Content
      id="tours.contentManager.Publish.content"
      defaultMessage='Click the "Publish" button to make your content available on the content API.'
    />
    <Step.Actions>
      <StepCount tourName="contentManager" />
      <GotItAction onClick={() => dispatch({ type: 'next_step', payload: 'contentManager' })} />
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

export const contentManagerSteps = [
  {
    name: 'Introduction',
    when: (completedActions: CompletedActions) =>
      completedActions.includes(GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema),
    content: Introduction,
  },
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
    when: (completedActions: CompletedActions) =>
      completedActions.includes(GUIDED_TOUR_REQUIRED_ACTIONS.contentManager.createContent),
  },
] as const;
