import { render } from '@tests/utils';

import { LeftMenu } from '../LeftMenu';

describe('LeftMenu', () => {
  // Regression for #26389: when a plugin incompatibility leaves the section
  // links undefined, `[...pluginsSectionLinks, ...generalSectionLinks].sort()`
  // threw "... is not iterable" and crashed the whole admin UI. The `= []`
  // prop defaults make the component render an (empty) menu instead.
  it('renders without crashing when section links are undefined', () => {
    expect(() =>
      // generalSectionLinks / pluginsSectionLinks intentionally omitted.
      render(<LeftMenu topMobileNavigation={[]} burgerMobileNavigation={[]} />)
    ).not.toThrow();
  });

  it('renders without crashing when section links are provided', () => {
    expect(() =>
      render(
        <LeftMenu
          generalSectionLinks={[]}
          pluginsSectionLinks={[]}
          topMobileNavigation={[]}
          burgerMobileNavigation={[]}
        />
      )
    ).not.toThrow();
  });
});
