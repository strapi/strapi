import { RenderOptions, render as renderRTL, screen, waitFor } from '@tests/utils';
import { useLocation } from 'react-router-dom';

import { Pagination } from '../Pagination';

const LocationDisplay = () => {
  const location = useLocation();

  return (
    <ul>
      <li data-testId="location">{location.search}</li>
    </ul>
  );
};

const render = ({
  initialEntries,
  options,
  ...props
}: Partial<Pagination.Props> & Pagination.PageSizeProps & RenderOptions = {}) =>
  renderRTL(
    <Pagination.Root pageCount={2} total={100} defaultPageSize={50} {...props}>
      <Pagination.PageSize options={options} />
      <Pagination.Links />
    </Pagination.Root>,
    {
      initialEntries,
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
    }
  );

describe('Pagination', () => {
  it("doesn't render anything when there is not enough pagination data", () => {
    render({ pageCount: 0, total: 0 });

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('renders the complete pagination component when there is enough pagination data', () => {
    render();

    expect(screen.getByRole('combobox')).toHaveTextContent('50');
    expect(screen.getByText('Entries per page')).toBeInTheDocument();

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to previous page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to previous page' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(screen.getByRole('link', { name: 'Go to page 1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to next page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to next page' })).toHaveAttribute(
      'aria-disabled',
      'false'
    );
  });

  describe('PageSize', () => {
    it('should display the pageSize correctly if its in the url query', () => {
      render({
        initialEntries: [{ search: 'pageSize=50' }],
      });

      expect(screen.getByRole('combobox')).toHaveTextContent('50');
    });

    it('should render a custom list of options if provided', async () => {
      const options = ['5', '10', '15'];

      const { user } = render({ options, defaultPageSize: 10 });

      await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('10'));

      await user.click(screen.getByRole('combobox'));

      options.forEach((option) => {
        expect(screen.getByRole('option', { name: option })).toBeInTheDocument();
      });
    });

    describe('interaction', () => {
      it('should change the value when the user selects a new value', async () => {
        const { user } = render();

        await user.click(screen.getByRole('combobox'));

        await user.click(screen.getByRole('option', { name: '20' }));

        expect(screen.getByRole('combobox')).toHaveTextContent('20');

        const searchParams = new URLSearchParams(screen.getByTestId('location').textContent ?? '');

        expect(searchParams.has('pageSize')).toBe(true);
        expect(searchParams.get('pageSize')).toBe('20');
      });

      it('should use the default value and then change the value when the user selects a new value', async () => {
        const { getByRole, user } = render({ defaultPageSize: 20 });

        expect(getByRole('combobox')).toHaveTextContent('20');

        await user.click(getByRole('combobox'));

        await user.click(getByRole('option', { name: '50' }));

        expect(getByRole('combobox')).toHaveTextContent('50');
      });
    });
  });

  describe('Links', () => {
    it('should display 4 links when the pageCount is greater than 4', () => {
      render({
        pageCount: 4,
      });

      expect(screen.getByRole('link', { name: 'Go to previous page' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to previous page' })).toHaveAttribute(
        'aria-disabled',
        'true'
      );

      expect(screen.getByRole('link', { name: 'Go to page 1' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to page 2' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to page 3' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to page 4' })).toBeInTheDocument();

      expect(screen.getByRole('link', { name: 'Go to next page' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to next page' })).toHaveAttribute(
        'aria-disabled',
        'false'
      );
    });

    it('should render only 4 links when the page count is 5 or greater', () => {
      const { rerender } = render({ pageCount: 5 });

      expect(screen.getByRole('link', { name: 'Go to previous page' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to previous page' })).toHaveAttribute(
        'aria-disabled',
        'true'
      );

      expect(screen.getByRole('link', { name: 'Go to page 1' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to page 2' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to page 5' })).toBeInTheDocument();

      expect(screen.getByRole('link', { name: 'Go to next page' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to next page' })).toHaveAttribute(
        'aria-disabled',
        'false'
      );

      rerender(
        <Pagination.Root total={100} pageCount={10}>
          <Pagination.PageSize />
          <Pagination.Links />
        </Pagination.Root>
      );

      expect(screen.getByRole('link', { name: 'Go to page 1' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to page 2' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to page 10' })).toBeInTheDocument();
    });

    it('should render multiple dot elements when the page count is greater than 5 and the current page is greater than 4', () => {
      render({
        initialEntries: [{ pathname: '/', search: 'page=5' }],
        pageCount: 10,
      });

      expect(screen.getByRole('link', { name: 'Go to page 1' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to page 4' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to page 5' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to page 6' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to page 10' })).toBeInTheDocument();
    });

    it('should set the default page to the same as the query', () => {
      render({
        pageCount: 4,
        initialEntries: [{ pathname: '/', search: 'page=3' }],
      });

      expect(screen.getByRole('link', { name: 'Go to page 3' })).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('page=3');

      expect(screen.getByRole('link', { name: 'Go to previous page' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to previous page' })).toHaveAttribute(
        'aria-disabled',
        'false'
      );

      expect(screen.getByRole('link', { name: 'Go to next page' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to next page' })).toHaveAttribute(
        'aria-disabled',
        'false'
      );
    });

    it('should change the page correctly when the user clicks on a page link', async () => {
      const { user } = render({
        pageCount: 4,
        initialEntries: [{ pathname: '/', search: 'page=3' }],
      });

      expect(screen.getByRole('link', { name: 'Go to page 3' })).toBeInTheDocument();

      await user.click(screen.getByRole('link', { name: 'Go to page 2' }));

      expect(screen.getByRole('link', { name: 'Go to page 2' })).toBeInTheDocument();

      expect(screen.getByTestId('location')).toHaveTextContent('page=2');
    });

    it('should change the page correctly when the user clicks on the arrows', async () => {
      const { user } = render({
        pageCount: 4,
        initialEntries: [{ pathname: '/', search: 'page=3' }],
      });

      expect(screen.getByRole('link', { name: 'Go to page 3' })).toBeInTheDocument();

      await user.click(screen.getByRole('link', { name: 'Go to previous page' }));

      expect(screen.getByRole('link', { name: 'Go to page 2' })).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('page=2');

      await user.click(screen.getByRole('link', { name: 'Go to next page' }));
      await user.click(screen.getByRole('link', { name: 'Go to next page' }));

      expect(screen.getByRole('link', { name: 'Go to page 4' })).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('page=4');
    });

    it('should carry the rest of the query params when the user clicks on a page link', async () => {
      const { user } = render({
        pageCount: 4,
        initialEntries: [{ pathname: '/', search: 'page=3&search=foo' }],
      });

      expect(screen.getByRole('link', { name: 'Go to page 3' })).toBeInTheDocument();

      await user.click(screen.getByRole('link', { name: 'Go to page 2' }));

      expect(screen.getByRole('link', { name: 'Go to page 2' })).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('page=2');

      expect(screen.getByRole('link', { name: 'Go to page 4' })).toHaveAttribute(
        'href',
        '/?pageSize=50&page=4&search=foo'
      );
    });
  });
});
