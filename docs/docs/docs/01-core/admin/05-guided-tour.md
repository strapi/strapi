
# Guided Tour

The Guided Tour provides an interactive onboarding experience that guides new users through key features of the admin panel. This documentation explains how the system works and how to create new guided tours.

## Architecture Overview

The Guided Tour system is built with a modular architecture consisting of:

- **Context Provider** (`Context.tsx`) - Global state management and persistence
- **Tour Factory** (`Tours.tsx`) - Tour creation and step management  
- **Step Components** (`Step.tsx`) - Reusable popover components for tour steps
- **Overview Component** (`Overview.tsx`) - Homepage tour overview and progress tracking

### Core Files

```
GuidedTour/
├── Context.tsx         # State management and React context
├── Tours.tsx           # Tour definitions and factory functions
├── Step.tsx            # Step component factory and UI
├── Overview.tsx        # Homepage overview component
└── tests/
    └── reducer.test.ts # Unit tests for state reducer
```

## Core Concepts

### 1. Tours and Steps

Tours are collections of steps that guide users through specific workflows. Each step will display its content in a popover. 

```typescript
const tours = {
  contentTypeBuilder: createTour('contentTypeBuilder', [
    {
      name: 'Introduction',
      content: (Step) => (
        <Step.Root>
          <Step.Title id="tour.title" defaultMessage="Welcome!" />
          <Step.Content id="tour.content" defaultMessage="Let's get started." />
          <Step.Actions showSkip />
        </Step.Root>
      ),
    },
    // ... more steps
  ]),
};
```

### 2. State Management

The tour state is managed through a React Context with a reducer pattern:

```typescript
type State = {
  tours: Tour;                    // Tour progress for each tour
  enabled: boolean;               // Whether tours are globally enabled
  completedActions: ExtendedCompletedActions;  // User-completed actions
};
```

### 3. Conditional Steps

Steps can be conditionally displayed based on user actions:

```typescript
{
  name: 'ConditionalStep',
  when: (completedActions) => completedActions.includes('didCreateContent'),
  content: (Step) => (/* step content */)
}
```

## Usage Guide

### Creating a New Tour

1. **Define the tour structure** in `Tours.tsx`:

```typescript
const myNewTour = createTour('myNewTour', [
  {
    name: 'Introduction',
    content: (Step) => (
      <Step.Root>
        <Step.Title 
          id="tours.myNewTour.Introduction.title"
          defaultMessage="My New Feature"
        />
        <Step.Content 
          id="tours.myNewTour.Introduction.content"
          defaultMessage="This tour will show you how to use this feature."
        />
        <Step.Actions showSkip />
      </Step.Root>
    ),
  },
  {
    name: 'MainAction',
    content: (Step) => (
      <Step.Root side="right" sideOffset={16}>
        <Step.Title 
          id="tours.myNewTour.MainAction.title"
          defaultMessage="Main Action"
        />
        <Step.Content 
          id="tours.myNewTour.MainAction.content"
          defaultMessage="Click this button to perform the main action."
        />
        <Step.Actions />
      </Step.Root>
    ),
  },
  {
    name: 'Finish',
    content: (Step) => (
      <Step.Root>
        <Step.Title 
          id="tours.myNewTour.Finish.title"
          defaultMessage="You're all set!"
        />
        <Step.Content 
          id="tours.myNewTour.Finish.content"
          defaultMessage="You've successfully completed this tour."
        />
        <Step.Actions showStepCount={false} to="/next-page" />
      </Step.Root>
    ),
    when: (completedActions) => completedActions.includes('didCompleteMainAction'),
  },
]);

// Add to the tours object
const tours = {
  // ... existing tours
  myNewTour,
} as const;
```

2. **Add tour components to Strapi**:

Wrap the element that should be the anchor for the step popover.

```tsx
import { tours } from '@strapi/admin/strapi-admin';

const MyComponent = () => {
  return (
    <div>
      <tours.myNewTour.Introduction>
        <h1>My Feature Title</h1>
      </tours.myNewTour.Introduction>
      
      <tours.myNewTour.MainAction>
        <Button onClick={handleMainAction}>
          Main Action
        </Button>
      </tours.myNewTour.MainAction>
    </div>
  );
};
```

3. **Mark actions complete** to trigger conditional steps:

:::note
To foster a declarative API it is recommended to update the [backend endpoint](#backend-integration) for actions that save to the database and invalidate the cache when the action is completed. Otherwise an action on the frontend (ie didCopyApiToken) can update the state imperatively. 
:::

```tsx
import { useGuidedTour } from './Context';

const MyComponent = () => {
  const dispatch = useGuidedTour('MyComponent', (s) => s.dispatch);
  
  const handleMainAction = () => {
    // Perform the action
    performMainAction();
    
    // Track the completion
    dispatch({
      type: 'set_completed_actions',
      payload: ['didCompleteSomeAction'],
    });
  };
};
```

### Step Components API

Each step provides three main components:

#### Step.Root
The container for the popover with positioning options. Wraps and receives the same props as the [Radix popover](https://www.radix-ui.com/primitives/docs/components/popover).

```tsx
<Step.Root 
  side="top|right|bottom|left"     // Popover position
  align="start|center|end"         // Alignment along the side
  sideOffset={number}              // Offset from the anchor
  withArrow={boolean}              // Show/hide arrow (default: true)
>
```

#### Step.Title
The step title with i18n support:

```tsx
<Step.Title 
  id="translation.key" 
  defaultMessage="Default Title" 
/>

// Or with custom content:
<Step.Title>
  <CustomTitleComponent />
</Step.Title>
```

#### Step.Content  
The step content with i18n support:

```tsx
<Step.Content 
  id="translation.key" 
  defaultMessage="Default content message" 
/>

// Or with custom content:
<Step.Content>
  <CustomContentComponent />
</Step.Content>
```

#### Step.Actions
Action buttons with built-in functionality:

```tsx
<Step.Actions 
  showStepCount={boolean}    // Show "Step X of Y" (default: true)
  showSkip={boolean}         // Show skip button (default: false)  
  to="/path"                 // Navigate to path on next (optional)
/>

// Or with custom actions:
<Step.Actions>
  <CustomActionsComponent />
</Step.Actions>
```

## State Management

### State

The guided tour system initializes with a default state structure defined in the Context:

```typescript
type State = {
  tours: Tour;
  enabled: boolean;
  completedActions: ExtendedCompletedActions;
};
```

Example:

```typescript
const initialState = {
  tours: {
    contentManager: {
      currentStep: 0,
      length: 3,
      isCompleted: false,
    }
  },
  enabled: true,
  completedActions: ['didCreateSchema'],
};
```

### Actions

The tour reducer handles these actions:

- `next_step` - Advance to the next step in a tour
- `skip_tour` - Mark a tour as completed (skipped)
- `set_completed_actions` - Update the list of completed user actions
- `skip_all_tours` - Disable all tours globally
- `reset_all_tours` - Reset all tours to initial state

### Using the Hook

```tsx
import { useGuidedTour } from './Context';

const MyComponent = () => {
  const state = useGuidedTour('MyComponent', (s) => s.state);
  const dispatch = useGuidedTour('MyComponent', (s) => s.dispatch);
  
  const currentTour = state.tours.myNewTour;
  const isEnabled = state.enabled;
  const completedActions = state.completedActions;
  
  // Dispatch actions
  const handleNext = () => {
    dispatch({ type: 'next_step', payload: 'myNewTour' });
  };
};
```

### Persistence

Tour state is automatically persisted to localStorage using the `usePersistentState` hook with the key `STRAPI_GUIDED_TOUR`.

## Backend Integration

Tours integrate with the backend through:

- `useGetGuidedTourMetaQuery()` - Fetches tour metadata from the server
- Completed actions are synchronized between client and server. 
- First-time user detection (`isFirstSuperAdminUser`)

## E2E Testing

Tours are tested in the e2e test suite `tests/e2e/tests/admin/guided-tour.spec.ts`

## API Reference

### Types

```typescript
// Tour configuration
type TourStep<P extends string> = {
  name: P;
  content: Content;
  when?: (completedActions: ExtendedCompletedActions) => boolean;
};

// State management
type State = {
  tours: Tour;
  enabled: boolean;
  completedActions: ExtendedCompletedActions;
};

type Action = 
  | { type: 'next_step'; payload: ValidTourName }
  | { type: 'skip_tour'; payload: ValidTourName }
  | { type: 'set_completed_actions'; payload: ExtendedCompletedActions }
  | { type: 'skip_all_tours' }
  | { type: 'reset_all_tours' };

// Step components
type Step = {
  Root: React.ForwardRefExoticComponent<PopoverContentProps & { withArrow?: boolean }>;
  Title: (props: StepProps) => React.ReactNode;
  Content: (props: StepProps) => React.ReactNode;
  Actions: (props: ActionsProps & { to?: string } & FlexProps) => React.ReactNode;
};
```
