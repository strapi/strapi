import { DesignSystemProvider } from '@strapi/design-system';
import { fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';

import { IconPicker, IconPickerProps } from '../IconPicker';

const defaultProps = {
  intlLabel: {
    id: 'content-type-builder.modalForm.components.icon.label',
    defaultMessage: 'Icon',
  },
  name: 'componentToCreate.icon',
  onChange: jest.fn(),
  value: '',
};

const setup = (props?: Partial<IconPickerProps>) => {
  return {
    user: userEvent.setup(),
    ...render(<IconPicker {...defaultProps} {...props} />, {
      wrapper: ({ children }) => (
        <IntlProvider locale="en" defaultLocale="en">
          <DesignSystemProvider>
            <MemoryRouter>{children}</MemoryRouter>
          </DesignSystemProvider>
        </IntlProvider>
      ),
    }),
  };
};

describe('IconPicker', () => {
  it('should show the search icon by default and no search bar', () => {
    const { getByText } = setup();

    expect(getByText('Search icon button')).toBeInTheDocument();
  });

  it('should show the searchbar if the search icon is clicked', async () => {
    const { getByText, getByPlaceholderText, user } = setup();

    await user.click(getByText('Search icon button'));

    expect(getByPlaceholderText('Search for an icon')).toBeInTheDocument();
  });

  it('should filter icons when write on the searchbar', async () => {
    const { user, getByText, getByPlaceholderText, queryByText } = setup();

    await user.click(getByText('Search icon button'));
    await user.type(getByPlaceholderText('Search for an icon'), 'calendar');

    expect(getByText('Select calendar icon')).toBeInTheDocument();
    expect(queryByText('Select Trash icon')).not.toBeInTheDocument();
  });

  it('should not render delete button if there is no icon selected', () => {
    const { queryByText } = setup();

    expect(queryByText('Remove the selected icon')).not.toBeInTheDocument();
  });

  it('should render delete button if there is an icon selected', async () => {
    const { getByText } = setup({ value: 'calendar' });

    expect(getByText('Remove the selected icon')).toBeInTheDocument();
  });

  it('should call onChange with an empty string when clicking on the delete button', async () => {
    const onChangeMock = jest.fn();
    const { user, getByRole } = setup({ value: 'calendar', onChange: onChangeMock });

    await user.click(getByRole('button', { name: 'Remove the selected icon' }));

    expect(onChangeMock).toHaveBeenCalledWith({
      target: { name: 'componentToCreate.icon', value: '' },
    });
  });

  it('should call onChange with the icon name when clicking on an icon', async () => {
    const onChangeMock = jest.fn();
    const { getByLabelText } = setup({ onChange: onChangeMock });

    fireEvent.click(getByLabelText('Select calendar icon'));

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
