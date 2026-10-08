import * as React from 'react';

import { useForm } from '@strapi/admin/strapi-admin';
import { Box, BoxProps, Flex, Grid } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { EditLayout } from '../../../hooks/useDocumentLayout';

import { InputRenderer } from './InputRenderer';

import type { UseDocument } from '../../../hooks/useDocument';

/* -------------------------------------------------------------------------------------------------
 * LazyFormRow
 * -----------------------------------------------------------------------------------------------*/

type LayoutField = EditLayout['layout'][number][number][number];

/**
 * Rough rendered heights, only used to size placeholders so the scrollbar stays sensible.
 */
const ESTIMATED_HEIGHT: Partial<Record<LayoutField['type'], number>> = {
  richtext: 320,
  blocks: 320,
  json: 240,
  component: 240,
  dynamiczone: 160,
  relation: 120,
  media: 160,
  text: 120,
};
const DEFAULT_ESTIMATED_HEIGHT = 80;

/**
 * How far outside of the scroll container a row starts mounting, so scrolling doesn't reveal
 * placeholders.
 */
const MOUNT_MARGIN = '1200px 0px';

const getScrollParent = (element: HTMLElement | null): HTMLElement | null => {
  for (let node = element?.parentElement; node; node = node.parentElement) {
    const { overflowY } = window.getComputedStyle(node);

    if (/(auto|scroll)/.test(overflowY) && node.scrollHeight > node.clientHeight) {
      return node;
    }
  }

  return null;
};

/* -------------------------------------------------------------------------------------------------
 * Idle mount queue
 * -----------------------------------------------------------------------------------------------*/

type ScheduleMount = (mount: () => void) => () => void;

interface IdleMountQueue {
  schedule: ScheduleMount;
  dispose: () => void;
}

const requestIdle = (callback: () => void): number =>
  typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(callback, { timeout: 2000 })
    : window.setTimeout(callback, 16);

const cancelIdle = (handle: number) =>
  typeof window.cancelIdleCallback === 'function'
    ? window.cancelIdleCallback(handle)
    : window.clearTimeout(handle);

/**
 * Mounts the rows that weren't needed for the first paint, one per idle period, in the order
 * they were scheduled (top to bottom). Rows are then already rendered when the user scrolls to
 * them, and the browser search finds every field.
 */
const createIdleMountQueue = (): IdleMountQueue => {
  let queue: Array<() => void> = [];
  let handle: number | null = null;

  const flush = () => {
    handle = null;
    queue.shift()?.();

    if (queue.length > 0) {
      handle = requestIdle(flush);
    }
  };

  return {
    schedule: (mount) => {
      queue.push(mount);

      if (handle === null) {
        handle = requestIdle(flush);
      }

      return () => {
        queue = queue.filter((scheduled) => scheduled !== mount);
      };
    },
    dispose: () => {
      queue = [];

      if (handle !== null) {
        cancelIdle(handle);
        handle = null;
      }
    },
  };
};

const IdleMountContext = React.createContext<ScheduleMount | null>(null);

const useIdleMountQueue = () => {
  const [queue] = React.useState(createIdleMountQueue);

  React.useEffect(() => queue.dispose, [queue]);

  return queue.schedule;
};

/* -------------------------------------------------------------------------------------------------
 * LazyFormRow
 * -----------------------------------------------------------------------------------------------*/

interface LazyFormRowProps {
  fields: Pick<LayoutField, 'name' | 'type'>[];
  children: React.ReactNode;
}

/**
 * Mounts its children once they get close to the viewport, or in the background when the
 * browser is idle, then keeps them mounted. Rendering every field of a large content type
 * upfront is what makes the edit view slow: the cost of the first render should depend on
 * the screen, not on the size of the model.
 */
const LazyFormRow = ({ fields, children }: LazyFormRowProps) => {
  const scheduleMount = React.useContext(IdleMountContext);
  const placeholderRef = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(
    () => typeof IntersectionObserver === 'undefined'
  );

  // A field in error has to be mounted so the error is displayed and can receive the focus.
  const hasError = useForm('LazyFormRow', (state) =>
    fields.some(({ name }) => name in state.errors)
  );

  const shouldMount = isVisible || hasError;

  React.useEffect(() => {
    const placeholder = placeholderRef.current;

    if (shouldMount || !placeholder) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
        }
      },
      { root: getScrollParent(placeholder), rootMargin: MOUNT_MARGIN }
    );

    observer.observe(placeholder);

    // Low priority: user input interrupts the render of a row mounted in the background.
    const cancelIdleMount = scheduleMount?.(() =>
      React.startTransition(() => {
        setIsVisible(true);
      })
    );

    return () => {
      observer.disconnect();
      cancelIdleMount?.();
    };
  }, [shouldMount, scheduleMount]);

  if (shouldMount) {
    return <>{children}</>;
  }

  const height = Math.max(
    ...fields.map(({ type }) => ESTIMATED_HEIGHT[type] ?? DEFAULT_ESTIMATED_HEIGHT)
  );

  return <div ref={placeholderRef} style={{ height }} aria-hidden />;
};

export const ResponsiveGridRoot = styled(Grid.Root)`
  container-type: inline-size;
`;

export const ResponsiveGridItem =
  /**
   * TODO:
   * JSDOM cannot handle container queries.
   * This is a temporary workaround so that tests do not fail in the CI when jestdom throws an error
   * for failing to parse the stylesheet.
   */
  process.env.NODE_ENV !== 'test'
    ? styled(Grid.Item)<{ col: number }>`
        grid-column: span 12;
        ${({ theme }) => theme.breakpoints.medium} {
          ${({ col }) => col && `grid-column: span ${col};`}
        }
      `
    : styled(Grid.Item)<{ col: number }>`
        grid-column: span 12;
      `;

const panelStyles = {
  padding: {
    initial: 4,
    medium: 6,
  },
  borderColor: 'neutral150',
  background: 'neutral0',
  hasRadius: true,
  shadow: 'tableShadow',
} satisfies BoxProps;

interface FormLayoutProps extends Pick<EditLayout, 'layout'> {
  hasBackground?: boolean;
  document: ReturnType<UseDocument>;
}

const FormLayout = React.memo(({ layout, document, hasBackground = true }: FormLayoutProps) => {
  const { formatMessage } = useIntl();
  const scheduleMount = useIdleMountQueue();
  const modelUid = document.schema?.uid;

  const getLabel = (name: string, label: string) => {
    return formatMessage({
      id: `content-manager.content-types.${modelUid}.${name}`,
      defaultMessage: label,
    });
  };

  return (
    <IdleMountContext.Provider value={scheduleMount}>
      <Flex direction="column" alignItems="stretch" gap={6}>
        {layout.map((panel, index) => {
          if (panel.some((row) => row.some((field) => field.type === 'dynamiczone'))) {
            const [row] = panel;
            const [field] = row;

            return (
              <LazyFormRow key={field.name} fields={[field]}>
                <Grid.Root gap={4}>
                  <Grid.Item col={12} s={12} xs={12} direction="column" alignItems="stretch">
                    <InputRenderer
                      {...field}
                      label={getLabel(field.name, field.label)}
                      document={document}
                    />
                  </Grid.Item>
                </Grid.Root>
              </LazyFormRow>
            );
          }

          return (
            <Box key={index} {...(hasBackground && panelStyles)}>
              <Flex direction="column" alignItems="stretch" gap={6}>
                {panel.map((row, gridRowIndex) => {
                  return (
                    <LazyFormRow key={gridRowIndex} fields={row}>
                      <ResponsiveGridRoot gap={{ initial: 6, medium: 4 }}>
                        {row.map(({ size, ...field }) => {
                          return (
                            <ResponsiveGridItem
                              col={size}
                              key={field.name}
                              s={12}
                              xs={12}
                              direction="column"
                              alignItems="stretch"
                            >
                              <InputRenderer
                                {...field}
                                label={getLabel(field.name, field.label)}
                                document={document}
                              />
                            </ResponsiveGridItem>
                          );
                        })}
                      </ResponsiveGridRoot>
                    </LazyFormRow>
                  );
                })}
              </Flex>
            </Box>
          );
        })}
      </Flex>
    </IdleMountContext.Provider>
  );
});

FormLayout.displayName = 'FormLayout';

export { FormLayout, FormLayoutProps };
