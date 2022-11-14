import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';

import DynamicComponent from '../DynamicComponent';

import { layoutData } from './fixtures';

jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => null,
}));

jest.mock('../../../../hooks', () => ({
  useContentTypeLayout: jest.fn().mockReturnValue({
    getComponentLayout: jest.fn().mockImplementation((componentUid) => layoutData[componentUid]),
  }),
}));

/**
 * We _could_ unmock this and use it, but it requires more
 * harnessing then is necessary and it's not worth it for these
 * tests when really we're focussing on dynamic zone behaviour.
 */
jest.mock('../../../FieldComponent', () => () => null);

describe('DynamicComponent', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const TestComponent = (props) => (
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        <DynamicComponent
          componentUid="component1"
          name="dynamiczone"
          onMoveComponentDownClick={jest.fn()}
          onMoveComponentUpClick={jest.fn()}
          onRemoveComponentClick={jest.fn()}
          {...props}
        />
      </IntlProvider>
    </ThemeProvider>
  );

  const setup = (props) => render(<TestComponent {...props} />);

  it('should by default render the name of the component in the accordion trigger', () => {
    setup();

    expect(screen.getByRole('button', { name: 'component1' })).toBeInTheDocument();
  });

  it('should allow removal of the component & call the onRemoveComponentClick callback when the field isAllowed', () => {
    const onRemoveComponentClick = jest.fn();
    setup({ isFieldAllowed: true, onRemoveComponentClick });

    fireEvent.click(screen.getByRole('button', { name: 'Delete component1' }));

    expect(onRemoveComponentClick).toHaveBeenCalled();
  });

  it('should not show you the delete component button if isFieldAllowed is false', () => {
    setup({ isFieldAllowed: false });

    expect(screen.queryByRole('button', { name: 'Delete component1' })).not.toBeInTheDocument();
  });
});
