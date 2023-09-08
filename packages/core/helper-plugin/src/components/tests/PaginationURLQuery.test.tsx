import React from 'react';

import { render } from '@tests/utils';

import { PaginationURLQuery } from '../PaginationURLQuery';

describe('PaginationURLQuery', () => {
  it('renders when there is only one page', () => {
    const { getByRole } = render(<PaginationURLQuery pagination={{ pageCount: 1 }} />);

    expect(getByRole('navigation')).toBeInTheDocument();

    expect(getByRole('link', { name: 'Go to previous page' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to previous page' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
    expect(getByRole('link', { name: 'Go to page 1' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to page 1' })).toHaveAttribute('aria-current', 'page');
    expect(getByRole('link', { name: 'Go to next page' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to next page' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('should display 4 links when the pageCount is greater than 4', () => {
    const { getByRole } = render(<PaginationURLQuery pagination={{ pageCount: 4 }} />);

    expect(getByRole('link', { name: 'Go to previous page' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to previous page' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );

    expect(getByRole('link', { name: 'Go to page 1' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to page 1' })).toHaveAttribute('aria-current', 'page');
    expect(getByRole('link', { name: 'Go to page 2' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to page 3' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to page 4' })).toBeInTheDocument();

    expect(getByRole('link', { name: 'Go to next page' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to next page' })).toHaveAttribute(
      'aria-disabled',
      'false'
    );
  });

  it('should render only 4 links when the page count is 5 or greater', () => {
    const { getByRole, rerender } = render(<PaginationURLQuery pagination={{ pageCount: 5 }} />);

    expect(getByRole('link', { name: 'Go to previous page' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to previous page' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );

    expect(getByRole('link', { name: 'Go to page 1' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to page 1' })).toHaveAttribute('aria-current', 'page');
    expect(getByRole('link', { name: 'Go to page 2' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to page 5' })).toBeInTheDocument();

    expect(getByRole('link', { name: 'Go to next page' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to next page' })).toHaveAttribute(
      'aria-disabled',
      'false'
    );

    rerender(<PaginationURLQuery pagination={{ pageCount: 10 }} />);

    expect(getByRole('link', { name: 'Go to page 1' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to page 2' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to page 10' })).toBeInTheDocument();
  });

  it('should render multiple dot elements when the page count is greater than 5 and the current page is greater than 4', () => {
    const { getByRole } = render(<PaginationURLQuery pagination={{ pageCount: 10 }} />, {
      initialEntries: [{ pathname: '/', search: 'page=5' }],
    });

    expect(getByRole('link', { name: 'Go to page 1' })).toBeInTheDocument();

    expect(getByRole('link', { name: 'Go to page 4' })).toBeInTheDocument();

    expect(getByRole('link', { name: 'Go to page 5' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to page 5' })).toHaveAttribute('aria-current', 'page');

    expect(getByRole('link', { name: 'Go to page 6' })).toBeInTheDocument();

    expect(getByRole('link', { name: 'Go to page 10' })).toBeInTheDocument();
  });

  it('should set the default page to the same as the query', () => {
    const { getByRole } = render(<PaginationURLQuery pagination={{ pageCount: 4 }} />, {
      initialEntries: [{ pathname: '/', search: 'page=3' }],
    });

    expect(getByRole('link', { name: 'Go to page 3' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to page 3' })).toHaveAttribute('aria-current', 'page');

    expect(getByRole('link', { name: 'Go to previous page' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to previous page' })).toHaveAttribute(
      'aria-disabled',
      'false'
    );

    expect(getByRole('link', { name: 'Go to next page' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to next page' })).toHaveAttribute(
      'aria-disabled',
      'false'
    );
  });

  it('should change the page correctly when the user clicks on a page link', async () => {
    const { getByRole, user } = render(<PaginationURLQuery pagination={{ pageCount: 4 }} />, {
      initialEntries: [{ pathname: '/', search: 'page=3' }],
    });

    expect(getByRole('link', { name: 'Go to page 3' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to page 3' })).toHaveAttribute('aria-current', 'page');

    await user.click(getByRole('link', { name: 'Go to page 2' }));

    expect(getByRole('link', { name: 'Go to page 2' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to page 2' })).toHaveAttribute('aria-current', 'page');
  });

  it('should change the page correctly when the user clicks on the arrows', async () => {
    const { getByRole, user } = render(<PaginationURLQuery pagination={{ pageCount: 4 }} />, {
      initialEntries: [{ pathname: '/', search: 'page=3' }],
    });

    expect(getByRole('link', { name: 'Go to page 3' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to page 3' })).toHaveAttribute('aria-current', 'page');

    await user.click(getByRole('link', { name: 'Go to previous page' }));

    expect(getByRole('link', { name: 'Go to page 2' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to page 2' })).toHaveAttribute('aria-current', 'page');

    await user.click(getByRole('link', { name: 'Go to next page' }));
    await user.click(getByRole('link', { name: 'Go to next page' }));

    expect(getByRole('link', { name: 'Go to page 4' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to page 4' })).toHaveAttribute('aria-current', 'page');
  });

  it('should carry the rest of the query params when the user clicks on a page link', async () => {
    const { getByRole, user } = render(<PaginationURLQuery pagination={{ pageCount: 4 }} />, {
      initialEntries: [{ pathname: '/', search: 'page=3&search=foo' }],
    });

    expect(getByRole('link', { name: 'Go to page 3' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to page 3' })).toHaveAttribute('aria-current', 'page');

    await user.click(getByRole('link', { name: 'Go to page 2' }));

    expect(getByRole('link', { name: 'Go to page 2' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Go to page 2' })).toHaveAttribute('aria-current', 'page');

    expect(getByRole('link', { name: 'Go to page 4' })).toHaveAttribute(
      'href',
      '/?page=4&search=foo'
    );
  });
});
