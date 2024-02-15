/**
 * This component will render DescriptionComponents that return objects e.g. `cm.apis.addEditViewPanel`
 * these descriptions are still treated like components because users can use react hooks in them.
 *
 * Rendering them normally by mapping etc. causes mutliple render issues.
 */

import * as React from 'react';

import isEqual from 'lodash/isEqual';

import { useForceUpdate } from '../hooks/useForceUpdate';
import { useThrottledCallback } from '../hooks/useThrottledCallback';
import { cancelIdleCallback, requestIdleCallback } from '../utils/shims';

interface DescriptionComponent<Props, Description> {
  (props: Props): Description | null;
}

/* -------------------------------------------------------------------------------------------------
 * DescriptionComponentRenderer
 * -----------------------------------------------------------------------------------------------*/

interface DescriptionComponentRendererProps<Props = any, Description = any> {
  children: (descriptions: Array<Description & { id: string }>) => React.ReactNode;
  descriptions: DescriptionComponent<Props, Description>[];
  props: Props;
}

/**
 * @internal
 *
 * @description This component takes an array of DescriptionComponents, which are react components that return objects as opposed to JSX.
 * We render these in their own isolated memoized component and use an update function to push the data back out to the parent.
 * Saving it in a ref, and then "forcing" an update of the parent component to render the children of this component with the new data.
 *
 * The DescriptionCompoonents can take props and use react hooks hence why we render them as if they were a component. The update
 * function is throttled and managed to avoid erroneous updates where we could wait a single tick to update the entire UI, which
 * creates less "popping" from functions being called in rapid succession.
 */
const DescriptionComponentRenderer = <Props, Description>({
  children,
  props,
  descriptions,
}: DescriptionComponentRendererProps<Props, Description>) => {
  const statesRef = React.useRef<Record<string, { value: Description & { id: string } }>>({});
  const [tick, forceUpdate] = useForceUpdate();

  const requestHandle = React.useRef<number | null>(null);
  const requestUpdate = React.useCallback(() => {
    if (requestHandle.current) {
      cancelIdleCallback(requestHandle.current);
    }

    requestHandle.current = requestIdleCallback(() => {
      requestHandle.current = null;

      forceUpdate();
    });
  }, [forceUpdate]);

  /**
   * This will avoid us calling too many react updates in a short space of time.
   */
  const throttledRequestUpdate = useThrottledCallback(requestUpdate, 60, { trailing: true });

  const update = React.useCallback<DescriptionProps<Props, Description>['update']>(
    (id, description) => {
      if (description === null) {
        delete statesRef.current[id];
      } else {
        const current = statesRef.current[id];
        statesRef.current[id] = { ...current, value: { ...description, id } };
      }

      throttledRequestUpdate();
    },
    [throttledRequestUpdate]
  );

  const ids = React.useMemo(
    () => descriptions.map((description) => getCompId(description)),
    [descriptions]
  );

  const states = React.useMemo(
    () =>
      ids
        .map((id) => statesRef.current[id]?.value)
        .filter((state) => state !== null && state !== undefined),
    /**
     * we leave tick in the deps to ensure the memo is recalculated when the `update` function  is called.
     * the `ids` will most likely be stable unless we get new actions, but we can't respond to the Description
     * Component changing the ref data in any other way.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids, tick]
  );

  return (
    <>
      {descriptions.map((description) => {
        const key = getCompId(description);
        return (
          <Description key={key} id={key} description={description} props={props} update={update} />
        );
      })}
      {children(states)}
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Description
 * -----------------------------------------------------------------------------------------------*/

interface DescriptionProps<Props, Description> {
  description: DescriptionComponent<Props, Description>;
  id: string;
  props: Props;
  update: (id: string, value: Description | null) => void;
}

/**
 * Descriptions are objects, but to create the object, we allow users to create components,
 * this means they can use react hooks in them. It also means we need to render them
 * within a component, however because they return an object of data we can't add that
 * to the react tree, instead we push it back out to the parent.
 */
const Description = React.memo(
  ({ description, id, props, update }: DescriptionProps<any, any>) => {
    const comp = description(props);

    useShallowCompareEffect(() => {
      update(id, comp);

      return () => {
        update(id, null);
      };
    }, comp);

    return null;
  },
  (prev, next) => isEqual(prev.props, next.props)
);

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

const ids = new WeakMap<DescriptionComponent<any, any>, string>();

let counter = 0;

function getCompId<T, K>(comp: DescriptionComponent<T, K>): string {
  const cachedId = ids.get(comp);

  if (cachedId) return cachedId;

  const id = `${comp.name || (comp as any).displayName || '<anonymous>'}-${counter++}`;

  ids.set(comp, id);

  return id;
}

const useShallowCompareMemoize = <T,>(value: T): Array<T | undefined> => {
  const ref = React.useRef<T | undefined>(undefined);

  if (!isEqual(value, ref.current)) {
    ref.current = value;
  }

  return [ref.current];
};

const useShallowCompareEffect = (callback: React.EffectCallback, dependencies?: unknown) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the linter isn't able to see that deps are properly handled here
  React.useEffect(callback, useShallowCompareMemoize(dependencies));
};

export { DescriptionComponentRenderer };
export type { DescriptionComponentRendererProps, DescriptionComponent };
