import { render, screen, waitFor } from '@tests/utils';

import { TruncatedText } from '../TruncatedText';

/**
 * Truncation is a layout fact, and jsdom has no layout engine — every element
 * reports 0 width. So the measurement itself can't be exercised here; these
 * stub scrollWidth/clientWidth to drive the two branches that matter, and assert
 * the tooltip is attached only when the text doesn't fit.
 */
const mockWidths = ({ scrollWidth, clientWidth }: { scrollWidth: number; clientWidth: number }) => {
  const original = {
    scroll: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollWidth'),
    client: Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth'),
  };

  Object.defineProperty(Element.prototype, 'scrollWidth', {
    configurable: true,
    get: () => scrollWidth,
  });
  Object.defineProperty(Element.prototype, 'clientWidth', {
    configurable: true,
    get: () => clientWidth,
  });

  return () => {
    if (original.scroll) {
      Object.defineProperty(Element.prototype, 'scrollWidth', original.scroll);
    }
    if (original.client) {
      Object.defineProperty(Element.prototype, 'clientWidth', original.client);
    }
  };
};

describe('TruncatedText', () => {
  it('renders the text', () => {
    render(<TruncatedText>marketing_hero.png</TruncatedText>);

    expect(screen.getByText('marketing_hero.png')).toBeInTheDocument();
  });

  it('attaches a tooltip when the text overflows', async () => {
    const restore = mockWidths({ scrollWidth: 400, clientWidth: 200 });

    try {
      const { user } = render(<TruncatedText>a-very-long-folder-name</TruncatedText>);

      await user.hover(screen.getByText('a-very-long-folder-name'));

      // The DS tooltip renders its content into a portal on hover.
      expect(await screen.findByRole('tooltip')).toHaveTextContent('a-very-long-folder-name');
    } finally {
      restore();
    }
  });

  it('attaches no tooltip when the text fits', async () => {
    const restore = mockWidths({ scrollWidth: 200, clientWidth: 200 });

    try {
      const { user } = render(<TruncatedText>short</TruncatedText>);

      await user.hover(screen.getByText('short'));

      // Asserted through waitFor, not a bare query: the DS tooltip opens
      // asynchronously, so checking immediately after hover would pass even when
      // a tooltip *is* attached. Give it the chance to appear, then require that
      // it hasn't — a tooltip on fully visible text is noise, and announces a
      // description duplicating what is already on screen.
      await expect(
        waitFor(() => expect(screen.getByRole('tooltip')).toBeInTheDocument(), { timeout: 1500 })
      ).rejects.toThrow();
    } finally {
      restore();
    }
  });
});
