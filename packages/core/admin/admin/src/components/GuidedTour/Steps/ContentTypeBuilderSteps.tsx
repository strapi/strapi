import { UID } from '@strapi/types';
import { useParams } from 'react-router-dom';

import { useGetGuidedTourMetaQuery } from '../../../services/admin';
import { CompletedActions } from '../Context';
import { type StepContentProps } from '../Tours';
import { GUIDED_TOUR_REQUIRED_ACTIONS } from '../utils/constants';

import { GotItAction, StepCount } from './Step';

/* -------------------------------------------------------------------------------------------------
 * Step Components
 * -----------------------------------------------------------------------------------------------*/

const Introduction = ({ Step }: StepContentProps) => (
  <Step.Root sideOffset={33} withArrow={false}>
    <Step.Title
      id="tours.contentTypeBuilder.Introduction.title"
      defaultMessage="Content-Type Builder"
    />
    <Step.Content
      id="tours.contentTypeBuilder.Introduction.content"
      defaultMessage="Create and manage your content structure with collection types, single types and components."
    />
    <Step.Actions showPrevious={false} />
  </Step.Root>
);

const CollectionTypes = ({ Step }: StepContentProps) => (
  <Step.Root side="right" sideOffset={16}>
    <Step.Title
      id="tours.contentTypeBuilder.CollectionTypes.title"
      defaultMessage="Collection Types"
    />
    <Step.Content
      id="tours.contentTypeBuilder.CollectionTypes.content"
      defaultMessage="A content structure that can manage multiple entries, such as articles or products."
    />
    <Step.Actions />
  </Step.Root>
);

const SingleTypes = ({ Step }: StepContentProps) => (
  <Step.Root side="right" sideOffset={16}>
    <Step.Title id="tours.contentTypeBuilder.SingleTypes.title" defaultMessage="Single Types" />
    <Step.Content
      id="tours.contentTypeBuilder.SingleTypes.content"
      defaultMessage="A content structure that can manage a single entry, such as a homepage or a header."
    />
    <Step.Actions />
  </Step.Root>
);

const Components = ({ Step }: StepContentProps) => (
  <Step.Root side="right" sideOffset={16}>
    <Step.Title id="tours.contentTypeBuilder.Components.title" defaultMessage="Components" />
    <Step.Content
      id="tours.contentTypeBuilder.Components.content"
      defaultMessage="A reusable content structure that can be used across multiple content types, such as buttons, sliders or cards."
    />
    <Step.Actions />
  </Step.Root>
);

const YourTurn = ({ Step }: StepContentProps) => (
  <Step.Root side="right" sideOffset={16}>
    <Step.Title id="tours.contentTypeBuilder.YourTurn.title" defaultMessage="Your turn" />
    <Step.Content
      id="tours.contentTypeBuilder.YourTurn.content"
      defaultMessage="Create a collection type or single type and configure it."
    />
    <Step.Actions />
  </Step.Root>
);

const AddFields = ({ Step, dispatch }: StepContentProps) => (
  <Step.Root side="bottom">
    <Step.Title
      id="tours.contentTypeBuilder.AddFields.title"
      defaultMessage="Don't forget to add a field to your content type"
    />
    <Step.Content
      id="tours.contentTypeBuilder.AddFields.content"
      defaultMessage="Add the fields your content needs such as text, media and relations."
    />
    <Step.Actions>
      <StepCount tourName="contentTypeBuilder" />
      <GotItAction onClick={() => dispatch({ type: 'next_step', payload: 'contentTypeBuilder' })} />
    </Step.Actions>
  </Step.Root>
);

const Save = ({ Step, dispatch }: StepContentProps) => (
  <Step.Root side="right">
    <Step.Title id="tours.contentTypeBuilder.Save.title" defaultMessage="Save before you leave!" />
    <Step.Content
      id="tours.contentTypeBuilder.Save.content"
      defaultMessage="Save the changes you made here before leaving this page."
    />
    <Step.Actions>
      <StepCount tourName="contentTypeBuilder" />
      <GotItAction
        onClick={() => {
          // Ensure the completed action is removed
          // in the event the user already has a schema but is still doing the tour
          dispatch({
            type: 'remove_completed_action',
            payload: GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema,
          });
          dispatch({ type: 'next_step', payload: 'contentTypeBuilder' });
        }}
      />
    </Step.Actions>
  </Step.Root>
);

const Finish = ({ Step }: StepContentProps) => {
  const { data: guidedTourMeta } = useGetGuidedTourMetaQuery();
  const { '*': routeParams } = useParams();
  // Get the uid from the params
  const uid = routeParams?.split('/').pop();
  const contentType = uid ? guidedTourMeta?.data?.schemas?.[uid as UID.ContentType] : null;
  const contentTypeKindDictionary = {
    collectionType: 'collection-types',
    singleType: 'single-types',
  };

  const to = contentType
    ? `/content-manager/${contentTypeKindDictionary[contentType.kind]}/${contentType.uid}`
    : '/content-manager';

  return (
    <Step.Root side="right">
      <Step.Title
        id="tours.contentTypeBuilder.Finish.title"
        defaultMessage="It's time to create content!"
      />
      <Step.Content
        id="tours.contentTypeBuilder.Finish.content"
        defaultMessage="Now that you created content types, you'll be able to create content in the content manager."
      />
      <Step.Actions showStepCount={false} showPrevious={false} to={to} />
    </Step.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Steps
 * -----------------------------------------------------------------------------------------------*/

export const contentTypeBuilderSteps = [
  {
    name: 'Introduction',
    content: Introduction,
  },
  {
    name: 'CollectionTypes',
    content: CollectionTypes,
  },
  {
    name: 'SingleTypes',
    content: SingleTypes,
  },
  {
    name: 'Components',
    content: Components,
  },
  {
    name: 'YourTurn',
    content: YourTurn,
  },
  {
    name: 'AddFields',
    content: AddFields,
  },
  {
    name: 'Save',
    when: (completedActions: CompletedActions) =>
      completedActions.includes(GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.addField),
    content: Save,
  },
  {
    name: 'Finish',
    content: Finish,
    excludeFromStepCount: true,
    when: (completedActions: CompletedActions) =>
      completedActions.includes(GUIDED_TOUR_REQUIRED_ACTIONS.contentTypeBuilder.createSchema),
  },
] as const;
