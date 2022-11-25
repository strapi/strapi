import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';

import * as Accordion from '../Accordion';

describe('RepeatableComponent | Accordion', () => {
  describe('Group', () => {
    const defaultProps = {
      children: 'I am a child',
    };

    const TestComponent = (props) => (
      <ThemeProvider theme={lightTheme}>
        <IntlProvider locale="en" messages={{}} defaultLocale="en">
          <Accordion.Group {...defaultProps} {...props} />
        </IntlProvider>
      </ThemeProvider>
    );

    const setup = (props) => render(<TestComponent {...props} />);

    it('should render the children passed to it', () => {
      const { container, getByText } = setup();

      expect(getByText('I am a child')).toBeInTheDocument();

      expect(container).toMatchSnapshot();
    });

    it('should render the error if there is one', () => {
      const { container, getByText } = setup({
        error: { id: 'error', defaultMessage: 'I have an error' },
      });

      expect(getByText('I have an error')).toBeInTheDocument();

      expect(container).toMatchSnapshot();
    });

    it('should make the children keyboard navigable', async () => {
      const user = userEvent.setup();

      const { getByText } = setup({
        children: (
          <div>
            <div>
              <button data-strapi-accordion-toggle type="button">
                I am a first button
              </button>
            </div>
            <div>
              <button data-strapi-accordion-toggle type="button">
                I am a second button
              </button>
            </div>
          </div>
        ),
      });

      await user.tab();

      expect(getByText('I am a first button')).toHaveFocus();

      await user.keyboard('[ArrowDown]');

      expect(getByText('I am a second button')).toHaveFocus();
    });
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
