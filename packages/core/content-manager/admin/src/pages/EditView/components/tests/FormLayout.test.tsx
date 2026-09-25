jest.mock('../InputRenderer', () => ({ InputRenderer: () => null }));

const browserUserAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36';

const renderGridStyles = (userAgent: string | undefined, col: number) => {
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let componentStyles = '';
  let mediumBreakpoint = '';

  try {
    // The exported component chooses its branch when the module is evaluated. Load React,
    // its renderer, and styled-components together so each isolated module shares one instance.
    jest.isolateModules(() => {
      const React = jest.requireActual<typeof import('react')>('react');
      const { renderToStaticMarkup } =
        jest.requireActual<typeof import('react-dom/server')>('react-dom/server.node');
      const { ServerStyleSheet, ThemeProvider } =
        jest.requireActual<typeof import('styled-components')>('styled-components');
      const { lightTheme } =
        jest.requireActual<typeof import('@strapi/design-system')>('@strapi/design-system');

      // Browser-aware dependencies initialize before varying the environment observed by
      // FormLayout. In particular, React DOM reads navigator while a JSDOM window exists.
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: userAgent === undefined ? undefined : { userAgent },
      });
      const { ResponsiveGridItem } =
        jest.requireActual<typeof import('../FormLayout')>('../FormLayout');
      const sheet = new ServerStyleSheet();

      try {
        renderToStaticMarkup(
          sheet.collectStyles(
            React.createElement(
              ThemeProvider,
              { theme: lightTheme },
              React.createElement(ResponsiveGridItem, { col }, 'field')
            )
          )
        );

        // Inspect this wrapper's emitted CSS, not Grid.Item's inherited rules, which can
        // also contain column spans and would otherwise hide a broken wrapper branch.
        const groups = sheet
          .getStyleTags()
          .matchAll(/([\s\S]*?)data-styled\.g\d+\[id="([^"]+)"\]\{[^}]*\}\/\*!sc\*\//g);
        const group = [...groups].find(([, , id]) => id === ResponsiveGridItem.styledComponentId);

        if (!group) {
          throw new Error('ResponsiveGridItem did not emit its component stylesheet');
        }

        componentStyles = group[1].replace(/\s+/g, '');
        mediumBreakpoint = lightTheme.breakpoints.medium.replace(/\s+/g, '');
      } finally {
        sheet.seal();
      }
    });
  } finally {
    if (navigatorDescriptor) {
      Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'navigator');
    }
  }

  return { componentStyles, mediumBreakpoint };
};

describe('FormLayout responsive grid environment', () => {
  it.each([4, 6])(
    'emits the configured %i-column breakpoint for a browser in NODE_ENV=test',
    (col) => {
      expect(process.env.NODE_ENV).toBe('test');
      const { componentStyles, mediumBreakpoint } = renderGridStyles(browserUserAgent, col);

      expect(componentStyles).toContain('grid-column:span12;');
      expect(componentStyles).toContain(mediumBreakpoint);
      expect(componentStyles).toContain(`grid-column:span${col};`);
    }
  );

  it('emits only the full-width wrapper in JSDOM', () => {
    const { componentStyles, mediumBreakpoint } = renderGridStyles('Mozilla/5.0 (jsdom/26.1.0)', 6);

    expect(componentStyles).toContain('grid-column:span12;');
    expect(componentStyles).not.toContain(mediumBreakpoint);
    expect(componentStyles).not.toContain('grid-column:span6;');
  });

  it('emits responsive columns when navigator is unavailable', () => {
    const { componentStyles, mediumBreakpoint } = renderGridStyles(undefined, 6);

    expect(componentStyles).toContain('grid-column:span12;');
    expect(componentStyles).toContain(mediumBreakpoint);
    expect(componentStyles).toContain('grid-column:span6;');
  });
});
