import { render, waitFor } from '@tests/utils';
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

  it('should push value to query params after debounce delay', async () => {
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

    await waitFor(
      () => {
        expect(new URLSearchParams(getByRole('listitem').textContent ?? '').get('_q')).toBe(
          'michka'
        );
      },
      { timeout: 600 }
    ); // Wait for debounce (500ms) + buffer
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

    await waitFor(
      () => {
        expect(new URLSearchParams(getByRole('listitem').textContent ?? '').get('_q')).toBe(
          'michka'
        );
      },
      { timeout: 600 }
    );

    await user.click(getByRole('button', { name: 'Clear' }));

    expect(getByRole('textbox', { name: 'Search label' })).toHaveValue('');

    await waitFor(
      () => {
        expect(new URLSearchParams(getByRole('listitem').textContent ?? '').has('_q')).toBe(false);
      },
      { timeout: 600 }
    );
  });
});
