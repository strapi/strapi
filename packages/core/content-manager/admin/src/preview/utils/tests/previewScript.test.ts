import { INTERNAL_EVENTS, PREVIEW_HIGHLIGHT_COLORS } from '../constants';
import { previewScript } from '../previewScript';

const blocksValue = [
  {
    type: 'paragraph',
    children: [{ type: 'text', text: 'Hello' }],
  },
];

const runPreviewScript = () => {
  window.STRAPI_DISABLE_STEGA_DECODING = true;
  const script = `(${previewScript.toString()})(${JSON.stringify({
    shouldRun: true,
    colors: PREVIEW_HIGHLIGHT_COLORS,
  })})`;
  // eslint-disable-next-line no-eval
  eval(script);
};

describe('previewScript — blocks field changes', () => {
  beforeEach(async () => {
    document.body.innerHTML = '<div id="root">Preview content</div>';
    runPreviewScript();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });

  afterEach(() => {
    window.__strapi_previewCleanup?.();
    window.STRAPI_DISABLE_STEGA_DECODING = undefined;
  });

  test('forwards blocks field changes to the host via a window CustomEvent', () => {
    const handler = jest.fn();
    window.addEventListener(INTERNAL_EVENTS.STRAPI_FIELD_CHANGE, handler as EventListener);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: INTERNAL_EVENTS.STRAPI_FIELD_CHANGE,
          payload: { field: 'body', value: blocksValue },
        },
      })
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({
      field: 'body',
      value: blocksValue,
    });
  });

  test('does not forward non-blocks field changes via the blocks CustomEvent path', () => {
    const handler = jest.fn();
    window.addEventListener(INTERNAL_EVENTS.STRAPI_FIELD_CHANGE, handler as EventListener);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: INTERNAL_EVENTS.STRAPI_FIELD_CHANGE,
          payload: { field: 'title', value: 'Plain title' },
        },
      })
    );

    expect(handler).not.toHaveBeenCalled();
  });
});
