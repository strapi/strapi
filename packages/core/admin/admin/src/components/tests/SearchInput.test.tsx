import { render, fireEvent, waitFor } from '@tests/utils';
import { useLocation } from 'react-router-dom';

import { SearchInput } from '../SearchInput';

const LocationDisplay = () => {
  const location = useLocation();

  return (
    <ul>
      <li>{location.search}</li>
    </ul>
  );
};

describe('SearchInput', () => {
  it('should render an icon button by default', () => {
    const { getByRole } = render(<SearchInput label="Search label" />);

    expect(getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('should toggle searchbar form and searchbar', async () => {
    const { user, getByRole } = render(<SearchInput label="Search label" />);

    await user.click(getByRole('button', { name: 'Search' }));

    expect(getByRole('textbox', { name: 'Search label' })).toBeInTheDocument();
  });

  it('should push value to query params', async () => {
    const { user, getByRole } = render(<SearchInput label="Search label" />, {
      renderOptions: {
        wrapper({ children }) {
          return (
            <>
              {children}
              <LocationDisplay />
            </>
          );
        },
      },
    });

    await user.click(getByRole('button', { name: 'Search' }));

    await user.type(getByRole('textbox', { name: 'Search label' }), 'michka');

    await user.keyboard('[Enter]');

    const searchString = getByRole('listitem').textContent ?? '';
    const searchParams = new URLSearchParams(searchString);

    expect(searchParams.has('_q')).toBe(true);
    expect(searchParams.get('_q')).toBe('michka');
  });

  it('should clear value and update query params', async () => {
    const { user, getByRole } = render(<SearchInput label="Search label" />, {
      renderOptions: {
        wrapper({ children }) {
          return (
            <>
              {children}
              <LocationDisplay />
            </>
          );
        },
      },
    });

    await user.click(getByRole('button', { name: 'Search' }));

    await user.type(getByRole('textbox', { name: 'Search label' }), 'michka');

    await user.keyboard('[Enter]');

    expect(new URLSearchParams(getByRole('listitem').textContent ?? '').has('_q')).toBe(true);

    await user.click(getByRole('button', { name: 'Clear' }));

    expect(getByRole('textbox', { name: 'Search label' })).toHaveValue('');

    expect(new URLSearchParams(getByRole('listitem').textContent ?? '').has('_q')).toBe(false);
  });

  it('should close the search field when the input loses focus', async () => {
    const { user, getByRole, queryByRole } = render(<SearchInput label="Search label" />);

    // Open the search input by clicking the search icon button
    await user.click(getByRole('button', { name: 'Search' }));

    // The textbox should now be visible
    const textbox = getByRole('textbox', { name: 'Search label' });
    expect(textbox).toBeInTheDocument();

    // Simulate the blur event with no related target (i.e. clicked outside)
    fireEvent.blur(textbox, { relatedTarget: null });

    // Wait for the state update and verify the textbox is no longer in the document
    await waitFor(() => {
      expect(queryByRole('textbox', { name: 'Search label' })).not.toBeInTheDocument();
    });
  });
});
