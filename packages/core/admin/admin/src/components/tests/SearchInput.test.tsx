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

    expect(getByRole('searchbox', { name: 'Search label' })).toBeInTheDocument();
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

    await user.type(getByRole('searchbox', { name: 'Search label' }), 'michka');

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

    await user.type(getByRole('searchbox', { name: 'Search label' }), 'michka');

    await user.keyboard('[Enter]');

    expect(new URLSearchParams(getByRole('listitem').textContent ?? '').has('_q')).toBe(true);

    await user.click(getByRole('button', { name: 'Clear' }));

    expect(getByRole('searchbox', { name: 'Search label' })).toHaveValue('');

    expect(new URLSearchParams(getByRole('listitem').textContent ?? '').has('_q')).toBe(false);
  });

  describe('blur behavior', () => {
    it.each([
      {
        name: 'should close the search field when empty',
        inputValue: '',
        expectedToBeInDocument: false,
      },
      {
        name: 'should keep the search field open when not empty',
        inputValue: 'test',
        expectedToBeInDocument: true,
      },
    ])('$name', async ({ inputValue, expectedToBeInDocument }) => {
      const { user, getByRole, queryByRole } = render(<SearchInput label="Search label" />);

      // Open the search input
      await user.click(getByRole('button', { name: 'Search' }));

      const textbox = getByRole('searchbox', { name: 'Search label' });
      expect(textbox).toBeInTheDocument();

      // Type the value if any
      if (inputValue) {
        await user.type(textbox, inputValue);
        await user.keyboard('[Enter]');
      }

      // Simulate blur
      fireEvent.blur(textbox, { relatedTarget: null });

      // Check visibility
      await waitFor(() => {
        if (expectedToBeInDocument) {
          expect(getByRole('searchbox', { name: 'Search label' })).toBeInTheDocument();
        } else {
          expect(queryByRole('searchbox', { name: 'Search label' })).not.toBeInTheDocument();
        }
      });
    });
  });
});
