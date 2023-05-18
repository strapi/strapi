import React from 'react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { IntlProvider } from 'react-intl';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import IconPicker from '../index';

const makeApp = (props) => {
  const history = createMemoryHistory();

  const defaultProps = {
    intlLabel: {
      id: 'content-type-builder.modalForm.components.icon.label',
      defaultMessage: 'Icon',
    },
    name: 'componentToCreate.icon',
    onChange: jest.fn(),
    value: '',
  };

  return (
    <IntlProvider locale="en" messages={{}} defaultLocale="en">
      <ThemeProvider theme={lightTheme}>
        <Router history={history}>
          <IconPicker {...defaultProps} {...props} />
        </Router>
      </ThemeProvider>
    </IntlProvider>
  );
};

describe('IconPicker', () => {
  it('should render', () => {
    const App = makeApp();
    const { container } = render(App);

    expect(container).toMatchSnapshot();
  });

  it('should show the search icon by default and no search bar', () => {
    const App = makeApp();
    render(App);

    expect(screen.getByText('Search icon button')).toBeInTheDocument();
  });

  it('should show the searchbar if the search icon is clicked', async () => {
    const App = makeApp();
    render(App);

    await userEvent.click(screen.getByText('Search icon button'));

    expect(screen.getByPlaceholderText('Search for an icon')).toBeInTheDocument();
  });

  it('should filter icons when write on the searchbar', async () => {
    const App = makeApp();
    render(App);

    await userEvent.click(screen.getByText('Search icon button'));
    await userEvent.type(screen.getByPlaceholderText('Search for an icon'), 'calendar');

    expect(screen.getByText('Select calendar icon')).toBeInTheDocument();
    expect(screen.queryByText('Select Trash icon')).not.toBeInTheDocument();
  });

  it('should not render delete button if there is no icon selected', () => {
    const App = makeApp();
    render(App);

    expect(screen.queryByText('Remove the selected icon')).not.toBeInTheDocument();
  });

  it('should render delete button if there is an icon selected', async () => {
    const App = makeApp({ value: 'Calendar' });
    render(App);

    expect(screen.getByText('Remove the selected icon')).toBeInTheDocument();
  });

  it('should call onChange with an empty string when clicking on the delete button', async () => {
    const onChangeMock = jest.fn();
    const App = makeApp({ value: 'Calendar', onChange: onChangeMock });
    render(App);

    await userEvent.click(screen.getByText('Remove the selected icon'));

    expect(onChangeMock).toHaveBeenCalledWith({
      target: { name: 'componentToCreate.icon', value: '' },
    });
  });

  it('should call onChange with the icon name when clicking on an icon', async () => {
    const onChangeMock = jest.fn();
    const App = makeApp({ onChange: onChangeMock });
    render(App);

    fireEvent.click(screen.getByLabelText('Select calendar icon'));

    expect(onChangeMock);
    expect(onChangeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          name: 'componentToCreate.icon',
          value: 'calendar',
        }),
      })
    );
  });
});
