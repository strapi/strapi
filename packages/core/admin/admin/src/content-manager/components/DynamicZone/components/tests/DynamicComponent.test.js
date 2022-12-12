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

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useCMEditViewDataManager: jest.fn().mockImplementation(() => ({ modifiedData: {} })),
}));

/**
 * We _could_ unmock this and use it, but it requires more
 * harnessing then is necessary and it's not worth it for these
 * tests when really we're focussing on dynamic zone behaviour.
 */
jest.mock('../../../FieldComponent', () => () => "I'm a field component");

describe('DynamicComponent', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const defaultProps = {
    componentUid: 'component1',
    name: 'dynamiczone',
    onMoveComponentDownClick: jest.fn(),
    onMoveComponentUpClick: jest.fn(),
    onRemoveComponentClick: jest.fn(),
  };

  const TestComponent = (props) => (
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        <DynamicComponent {...defaultProps} {...props} />
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

  it('should hide the field component when you close the accordion', () => {
    setup();

    expect(screen.queryByText("I'm a field component")).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'component1' }));

    expect(screen.queryByText("I'm a field component")).not.toBeInTheDocument();
  });

  it('should show the up & down icons in a variety of boolean combinations', () => {
    const { rerender } = setup({ showUpIcon: true, showDownIcon: true });

    expect(screen.queryByRole('button', { name: 'Move component up' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move component down' })).toBeInTheDocument();

    rerender(<TestComponent {...defaultProps} showUpIcon={false} showDownIcon />);

    expect(screen.queryByRole('button', { name: 'Move component up' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move component down' })).toBeInTheDocument();

    rerender(<TestComponent {...defaultProps} showUpIcon showDownIcon={false} />);

    expect(screen.queryByRole('button', { name: 'Move component up' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move component down' })).not.toBeInTheDocument();

    rerender(<TestComponent {...defaultProps} showUpIcon={false} showDownIcon={false} />);

    expect(screen.queryByRole('button', { name: 'Move component up' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move component down' })).not.toBeInTheDocument();
  });

  it('should fire the onMoveComponentUpClick callback when the up icon is clicked', () => {
    const onMoveComponentUpClick = jest.fn();
    setup({ onMoveComponentUpClick, showUpIcon: true });

    fireEvent.click(screen.getByRole('button', { name: 'Move component up' }));

    expect(onMoveComponentUpClick).toHaveBeenCalled();
  });

  it('should fire the onMoveComponentDownClick callback when the down icon is clicked', () => {
    const onMoveComponentDownClick = jest.fn();
    setup({ onMoveComponentDownClick, showDownIcon: true });

    fireEvent.click(screen.getByRole('button', { name: 'Move component down' }));

    expect(onMoveComponentDownClick).toHaveBeenCalled();
  });

  it.todo('should handle errors in the fields');
});
