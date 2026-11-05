import { server } from '@strapi/admin/strapi-admin/test';

/**
 * base-ui radios forward a click to their hidden input with `new PointerEvent('click')`. The shared
 * setup's mock extends `Event`, and JSDOM only runs an input's activation behaviour (checking a
 * radio, hence its change event) for a `MouseEvent`. A PointerEvent is a MouseEvent in browsers.
 */
class MockPointerEvent extends MouseEvent {
  pointerType: string;

  constructor(type: string, props: MouseEventInit & { pointerType?: string } = {}) {
    super(type, props);
    this.pointerType = props.pointerType || 'mouse';
  }
}

Object.defineProperty(window, 'PointerEvent', {
  writable: true,
  value: MockPointerEvent,
});

beforeAll(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
