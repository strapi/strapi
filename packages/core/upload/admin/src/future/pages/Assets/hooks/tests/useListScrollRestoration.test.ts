import { createElement } from 'react';

import { render, fireEvent } from '@testing-library/react';

import { useListScrollRestoration } from '../useListScrollRestoration';

/**
 * Mirrors the admin layout: the media library renders inside a column marked
 * `data-strapi-main-content`, and that column is what scrolls. `createElement`
 * rather than JSX so this stays alongside the other `.ts` hook tests.
 */
const Harness = ({ listKey }: { listKey: string }) => {
  const anchorRef = useListScrollRestoration(listKey);

  return createElement(
    'div',
    { 'data-strapi-main-content': true, 'data-testid': 'scroll-root' },
    createElement('div', { ref: anchorRef })
  );
};

const renderHarness = (listKey: string) => render(createElement(Harness, { listKey }));

/**
 * jsdom has no layout, so `scrollTop` accepts anything. Real browsers clamp it
 * to the content that exists — which is why a restore must survive more than one
 * commit — so tests that care install a clamping property with a max they set.
 */
const clampScrollTop = (element: HTMLElement, getMax: () => number) => {
  let top = 0;

  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    get: () => top,
    set: (value: number) => {
      top = Math.min(value, getMax());
    },
  });
};

const scrollTo = (element: HTMLElement, top: number) => {
  element.scrollTop = top;
  fireEvent.scroll(element);
};

describe('useListScrollRestoration', () => {
  it('puts back the offset a list was left at', () => {
    const { getByTestId, rerender } = renderHarness('folder-1');
    const root = getByTestId('scroll-root');

    scrollTo(root, 640);

    // Into a subfolder: a list never seen before opens at the top.
    rerender(createElement(Harness, { listKey: 'folder-2' }));
    expect(root.scrollTop).toBe(0);

    // And back out again.
    rerender(createElement(Harness, { listKey: 'folder-1' }));
    expect(root.scrollTop).toBe(640);
  });

  it('leaves the offset alone while the list key holds steady', () => {
    const { getByTestId, rerender } = renderHarness('folder-1');
    const root = getByTestId('scroll-root');

    scrollTo(root, 640);
    // Loading another page re-renders without changing the list identity.
    rerender(createElement(Harness, { listKey: 'folder-1' }));

    expect(root.scrollTop).toBe(640);
  });

  it('keeps trying until the returning list is tall enough to hold the offset', () => {
    const { getByTestId, rerender } = renderHarness('folder-1');
    const root = getByTestId('scroll-root');

    let maxScrollTop = 1000;
    clampScrollTop(root, () => maxScrollTop);

    scrollTo(root, 640);

    // The subfolder is a single short page — nothing to scroll.
    maxScrollTop = 0;
    rerender(createElement(Harness, { listKey: 'folder-2' }));
    expect(root.scrollTop).toBe(0);

    // Back out. The rows have not rendered yet, so the offset is out of reach.
    rerender(createElement(Harness, { listKey: 'folder-1' }));
    expect(root.scrollTop).toBe(0);

    // The restored pages land and the column grows back.
    maxScrollTop = 1000;
    rerender(createElement(Harness, { listKey: 'folder-1' }));
    expect(root.scrollTop).toBe(640);
  });

  it('gives up on a restore the list never grows into', () => {
    jest.useFakeTimers();

    try {
      const { getByTestId, rerender } = renderHarness('folder-1');
      const root = getByTestId('scroll-root');

      let maxScrollTop = 1000;
      clampScrollTop(root, () => maxScrollTop);

      scrollTo(root, 640);

      maxScrollTop = 0;
      rerender(createElement(Harness, { listKey: 'folder-2' }));
      rerender(createElement(Harness, { listKey: 'folder-1' }));

      // Everything the folder held was deleted while the user was away, so the
      // offset is never reachable. Once the window closes the list stays put
      // rather than being yanked on some much later render.
      jest.advanceTimersByTime(5000);
      rerender(createElement(Harness, { listKey: 'folder-1' }));

      maxScrollTop = 1000;
      root.scrollTop = 120;
      rerender(createElement(Harness, { listKey: 'folder-1' }));

      expect(root.scrollTop).toBe(120);
    } finally {
      jest.useRealTimers();
    }
  });
});
