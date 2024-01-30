/**
 * This component will render DescriptionComponents that return objects e.g. `cm.apis.addEditViewPanel`
 * these descriptions are still treated like components because users can use react hooks in them.
 *
 * Rendering them normally by mapping etc. causes mutliple render issues.
 */

import * as React from 'react';

import { createCollection } from '@strapi/ui-primitives';

interface DescriptionComponent<Props, Description> {
  (props: Props): Description | null;
}

/* -------------------------------------------------------------------------------------------------
 * DescriptionComponentRenderer
 * -----------------------------------------------------------------------------------------------*/

const [Collection, useCollection] = createCollection<never, any>('DescriptionData');

interface DescriptionComponentRendererProps<Props = any, Description = any> {
  children: (descriptions: Description[]) => React.ReactNode;
  descriptions: DescriptionComponent<Props, Description>[];
  props: Props;
}

const DescriptionComponentRendererImpl = <Props, Description>({
  children,
  props,
  descriptions,
}: DescriptionComponentRendererProps<Props, Description>) => {
  const [items, setItems] = React.useState<Description[]>([]);
  const { subscribe } = useCollection(undefined);

  React.useEffect(() => {
    const unsub = subscribe((state) => {
      setItems(state);
    });

    return () => {
      unsub();
    };
  }, [subscribe]);

  return (
    <>
      {descriptions.map((description) => {
        const key = getCompId(description);
        return <Description key={key} id={key} description={description} props={props} />;
      })}
      {children(items)}
    </>
  );
};

const withCollection = <Props,>(
  WrappedComponent: React.ComponentType<DescriptionComponentRendererProps<Props, any>>
) => {
  return function (props: DescriptionComponentRendererProps<Props, any>) {
    return (
      <Collection.Provider scope={undefined}>
        <WrappedComponent {...props} />
      </Collection.Provider>
    );
  };
};

const DescriptionComponentRenderer = withCollection(DescriptionComponentRendererImpl);

/* -------------------------------------------------------------------------------------------------
 * Description
 * -----------------------------------------------------------------------------------------------*/

interface DescriptionProps<Props, Description> {
  description: DescriptionComponent<Props, Description>;
  id: string;
  props: Props;
}

/**
 * Descriptions are objects, but to create the object, we allow users to create components,
 * this means they can use react hooks in them. It also means we need to render them
 * within a component, however because they return an object of data we can't add that
 * to the react tree, instead we push it back out to the parent.
 */
const Description = React.memo(
  ({ description, id, props }: DescriptionProps<any, any>) => {
    const comp = description(props);

    if (!comp) {
      return null;
    }

    return <Collection.ItemSlot id={id} {...comp} />;
  },
  (prev, next) => prev.props === next.props
);

/* -------------------------------------------------------------------------------------------------
 * getId
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

export { DescriptionComponentRenderer };
export type { DescriptionComponentRendererProps, DescriptionComponent };
