import * as React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';

import * as Accordion from '../Accordion';

describe('RepeatableComponent | Accordion', () => {
  describe('Group', () => {
    const defaultProps = {};

    const TestComponent = (props) => (
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          <Accordion.Group {...defaultProps} {...props} />
        </IntlProvider>
      </ThemeProvider>
    );

    const setup = (props) => render(<TestComponent {...props} />);

    it.todo('should render the children passed to it');

    it.todo('should render the error if there is one');

    it.todo('should make the children keyboard navigable');
  });

  describe('Content', () => {
    it('should render and match the snapshot', () => {
      const { container } = render(
        <ThemeProvider theme={lightTheme}>
          <Accordion.Content />
        </ThemeProvider>
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe('Footer', () => {
    it('should render and match the snapshot', () => {
      const { container } = render(
        <ThemeProvider theme={lightTheme}>
          <Accordion.Footer />
        </ThemeProvider>
      );
      expect(container).toMatchSnapshot();
    });
  });
});
