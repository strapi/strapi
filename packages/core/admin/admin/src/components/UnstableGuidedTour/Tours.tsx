import type { State, Action } from './Context';

/* -------------------------------------------------------------------------------------------------
 * Tours
 * -----------------------------------------------------------------------------------------------*/

const tours = {
  contentManager: createTour('contentManager', [
    {
      name: 'TEST',
      content: () => (
        <>
          <div>This is TEST</div>
        </>
      ),
    },
  ]),
} as const;

type Tours = typeof tours;

/* -------------------------------------------------------------------------------------------------
 * Tour factory
 * -----------------------------------------------------------------------------------------------*/

type TourStep<P extends string> = {
  name: P;
  content: Content;
};

type Content = ({
  state,
  dispatch,
}: {
  state: State;
  dispatch: React.Dispatch<Action>;
}) => React.ReactNode;

function createTour<const T extends ReadonlyArray<TourStep<string>>>(tourName: string, steps: T) {
  type Components = {
    [K in T[number]['name']]: React.ComponentType<{ children: React.ReactNode }>;
  };

  const tour = steps.reduce((acc, step, index) => {
    if (step.name in acc) {
      throw Error(`The tour: ${tourName} with step: ${step.name} has already been registered`);
    }

    acc[step.name as keyof Components] = ({ children }: { children: React.ReactNode }) => (
      <div>
        <div>TODO: GuidedTourTooltip goes here and receives these props</div>
        <div style={{ display: 'flex', gap: 2 }}>
          <span>content:</span>
          {step.content({ state: { currentSteps: { contentManager: 0 } }, dispatch: () => {} })}
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <span>children:</span>
          {children}
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <span>tourName:</span>
          {tourName}
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <span>step:</span>
          {index}
        </div>
      </div>
    );

    return acc;
  }, {} as Components);

  return tour;
}

export type { Content, Tours };
export { tours };
