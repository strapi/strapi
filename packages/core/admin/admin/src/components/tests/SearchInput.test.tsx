import { render, fireEvent, waitFor } from '@tests/utils';
import { useLocation } from 'react-router-dom';

import { useIsMobile } from '../../hooks/useMediaQuery';
import { SearchInput } from '../SearchInput';

jest.mock('../../hooks/useMediaQuery', () => {
  const actual = jest.requireActual('../../hooks/useMediaQuery');

  return {
    ...actual,
    useIsMobile: jest.fn(),
  };
});

const LocationDisplay = () => {
  const location = useLocation();

  return (
    <ul>
      <li>{location.search}</li>
    </ul>
  );
};

describe('SearchInput', () => {
  const mockUseIsMobile = jest.mocked(useIsMobile);

  beforeEach(() => {
    mockUseIsMobile.mockReturnValue(false);
  });

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

  it('should keep an applied filter containing an ampersand when searching', async () => {
    const encoded = `filters[$and][0][name][$eq]=${encodeURIComponent('a&b')}`;

    const { user, getByRole } = render(<SearchInput label="Search label" />, {
      initialEntries: [{ search: `?${encoded}` }],
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
    await user.type(getByRole('searchbox', { name: 'Search label' }), 'needle');
    await user.keyboard('[Enter]');

    await waitFor(() => {
      expect(getByRole('listitem')).toHaveTextContent('_q=needle');
    });

    expect(getByRole('listitem')).toHaveTextContent(encoded);
  });

  it.each([
    ['a percent sign', '100%'],
    ['an ampersand', 'a&b'],
    ['a hash', 'a#b'],
  ])('should keep a filter containing %s when the search is cleared', async (_label, value) => {
    const encoded = `filters[$and][0][name][$eq]=${encodeURIComponent(value)}`;

    const { user, getByRole } = render(<SearchInput label="Search label" />, {
      initialEntries: [{ search: `?${encoded}&_q=needle` }],
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

    await user.click(getByRole('button', { name: 'Clear' }));

    await waitFor(() => {
      expect(new URLSearchParams(getByRole('listitem').textContent ?? '').has('_q')).toBe(false);
    });

    expect(getByRole('listitem')).toHaveTextContent(encoded);
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

  describe('mobile', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
    });

    it('should render the search field by default', () => {
      const { getByRole, queryByRole } = render(<SearchInput label="Search label" />);

      expect(getByRole('searchbox', { name: 'Search label' })).toBeInTheDocument();
      expect(queryByRole('button', { name: 'Search' })).not.toBeInTheDocument();
    });
  });
});
