import { Form, useForm } from '@strapi/admin/strapi-admin';
import { act, render, screen, fireEvent } from '@tests/utils';

import { FormLayout, FormLayoutProps, hasMountSideEffects } from '../FormLayout';

/**
 * The inputs themselves are not under test: render a plain input named after the field so we can
 * tell which rows are mounted.
 */
jest.mock('../InputRenderer', () => ({
  InputRenderer: ({ name }: { name: string }) =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('react').createElement('input', { name, 'aria-label': name }),
}));

type Attribute = Parameters<typeof hasMountSideEffects>[0];
type Components = Parameters<typeof hasMountSideEffects>[1];

const attribute = (value: Record<string, unknown>) => value as unknown as Attribute;

const components = {
  'shared.with-custom-field': {
    attributes: {
      color: { type: 'customField', customField: 'plugin::color-picker.color' },
    },
  },
  'shared.nested': {
    attributes: {
      inner: { type: 'component', component: 'shared.with-custom-field', repeatable: false },
    },
  },
  'shared.plain': {
    attributes: {
      label: { type: 'string' },
    },
  },
} as unknown as Components;

describe('hasMountSideEffects', () => {
  it('mounts a required UID right away, as it fetches its default value on mount', () => {
    expect(hasMountSideEffects(attribute({ type: 'uid', required: true }), components)).toBe(true);
    expect(hasMountSideEffects(attribute({ type: 'uid' }), components)).toBe(false);
  });

  it('mounts custom fields right away, as they may set a value on mount', () => {
    expect(
      hasMountSideEffects(
        attribute({ type: 'string', customField: 'plugin::color-picker.color' }),
        components
      )
    ).toBe(true);
  });

  it('looks into non-repeatable components, which are expanded by default', () => {
    expect(
      hasMountSideEffects(
        attribute({ type: 'component', component: 'shared.nested', repeatable: false }),
        components
      )
    ).toBe(true);
    expect(
      hasMountSideEffects(
        attribute({ type: 'component', component: 'shared.plain', repeatable: false }),
        components
      )
    ).toBe(false);
  });

  it('ignores repeatable components and other fields, which can be mounted lazily', () => {
    expect(
      hasMountSideEffects(
        attribute({ type: 'component', component: 'shared.with-custom-field', repeatable: true }),
        components
      )
    ).toBe(false);
    expect(hasMountSideEffects(attribute({ type: 'string' }), components)).toBe(false);
  });
});

describe('FormLayout', () => {
  /**
   * JSDOM has no IntersectionObserver (rows would all mount right away) and no idle periods:
   * both are driven manually so we can assert when each row is mounted.
   */
  let observers: Array<{ callback: IntersectionObserverCallback; elements: Element[] }>;
  let idleCallbacks: Array<() => void>;

  beforeEach(() => {
    observers = [];
    idleCallbacks = [];

    window.IntersectionObserver = class {
      private observer: (typeof observers)[number];

      constructor(callback: IntersectionObserverCallback) {
        this.observer = { callback, elements: [] };
        observers.push(this.observer);
      }

      observe(element: Element) {
        this.observer.elements.push(element);
      }

      disconnect() {}

      unobserve() {}
    } as unknown as typeof IntersectionObserver;

    window.requestIdleCallback = jest.fn((callback: () => void) => {
      idleCallbacks.push(callback);
      return idleCallbacks.length;
    }) as unknown as typeof window.requestIdleCallback;
    window.cancelIdleCallback = jest.fn();
  });

  afterEach(() => {
    // @ts-expect-error – removing the mocks restores JSDOM's default (undefined) behaviour
    delete window.IntersectionObserver;
    // @ts-expect-error – see above
    delete window.requestIdleCallback;
    // @ts-expect-error – see above
    delete window.cancelIdleCallback;
  });

  const field = (name: string, value: Record<string, unknown>) => ({
    name,
    label: name,
    type: value.type,
    size: 12,
    visible: true,
    disabled: false,
    attribute: value,
  });

  const layout = [
    [
      [field('title', { type: 'string' })],
      [field('summary', { type: 'text' })],
      [field('slug', { type: 'uid', required: true, targetField: 'title' })],
      [field('color', { type: 'string', customField: 'plugin::color-picker.color' })],
      [field('bottom', { type: 'string' })],
    ],
  ] as unknown as FormLayoutProps['layout'];

  const document = {
    schema: { uid: 'api::test.test' },
    components: {},
  } as unknown as FormLayoutProps['document'];

  const ErrorControls = () => {
    const setErrors = useForm('ErrorControls', (state) => state.setErrors);

    return (
      <>
        <button type="button" onClick={() => setErrors({ bottom: 'This value is required.' })}>
          Set errors
        </button>
        <button type="button" onClick={() => setErrors({})}>
          Clear errors
        </button>
      </>
    );
  };

  const renderLayout = () =>
    render(
      <Form method="PUT" initialValues={{}}>
        <ErrorControls />
        <FormLayout layout={layout} document={document} />
      </Form>
    );

  const isMounted = (name: string) => screen.queryByRole('textbox', { name }) !== null;

  it('mounts rows with a required UID or a custom field with the page, the others lazily', () => {
    renderLayout();

    expect(isMounted('slug')).toBe(true);
    expect(isMounted('color')).toBe(true);
    expect(isMounted('title')).toBe(false);
    expect(isMounted('summary')).toBe(false);
    expect(isMounted('bottom')).toBe(false);
  });

  it('mounts a row when it gets close to the viewport', () => {
    renderLayout();

    // The first lazy row is the title one
    const [{ callback, elements }] = observers;
    act(() => {
      callback(
        [{ isIntersecting: true, target: elements[0] } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(isMounted('title')).toBe(true);
    expect(isMounted('summary')).toBe(false);
  });

  it('mounts the remaining rows in the background, one per idle period', () => {
    renderLayout();

    act(() => idleCallbacks.shift()?.());
    expect(isMounted('title')).toBe(true);
    expect(isMounted('summary')).toBe(false);

    while (idleCallbacks.length > 0) {
      act(() => idleCallbacks.shift()?.());
    }
    expect(isMounted('summary')).toBe(true);
    expect(isMounted('bottom')).toBe(true);
  });

  it('mounts a row with an error right away and keeps it mounted once the errors are cleared', () => {
    renderLayout();
    expect(isMounted('bottom')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Set errors' }));
    expect(isMounted('bottom')).toBe(true);

    // Every validation starts by clearing the errors
    fireEvent.click(screen.getByRole('button', { name: 'Clear errors' }));
    expect(isMounted('bottom')).toBe(true);
  });
});
