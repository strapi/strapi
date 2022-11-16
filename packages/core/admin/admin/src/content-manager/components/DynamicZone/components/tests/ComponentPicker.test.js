import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';

import ComponentPicker from '../ComponentPicker';

import { layoutData } from './fixtures';

jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => null,
}));

jest.mock('../../../../hooks', () => ({
  useContentTypeLayout: jest.fn().mockReturnValue({
    getComponentLayout: jest.fn().mockImplementation((componentUid) => layoutData[componentUid]),
  }),
}));

describe('ComponentPicker', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const Component = (props) => (
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} defaultLocale="en">
        <ComponentPicker isOpen onClickAddComponent={jest.fn()} {...props} />
      </IntlProvider>
    </ThemeProvider>
  );

  const setup = (props) => render(<Component {...props} />);

  it('should by default give me the instruction to Pick one Component', () => {
    setup();

    expect(screen.getByText(/Pick one component/)).toBeInTheDocument();
  });

  it('should render null if isOpen is false', () => {
    setup({ isOpen: false });

    expect(screen.queryByText(/Pick one component/)).not.toBeInTheDocument();
  });

  it('should render the category names by default', () => {
    setup({ components: ['component1', 'component2'] });

    expect(screen.getByText(/myComponents/)).toBeInTheDocument();
  });

  it('should open the first category of components when isOpen changes to true from false', () => {
    const { rerender } = setup({
      isOpen: false,
    });

    rerender(<Component isOpen components={['component1', 'component2', 'component3']} />);

    expect(screen.getByText(/component1/)).toBeInTheDocument();
    expect(screen.queryByText(/component3/)).not.toBeInTheDocument();
  });

  it('should call onClickAddComponent with the componentUid when a Component is clicked', () => {
    const onClickAddComponent = jest.fn();
    setup({
      components: ['component1', 'component2'],
      onClickAddComponent,
    });

    fireEvent.click(screen.getByText(/component1/));

    expect(onClickAddComponent).toHaveBeenCalledWith('component1');
  });
});
