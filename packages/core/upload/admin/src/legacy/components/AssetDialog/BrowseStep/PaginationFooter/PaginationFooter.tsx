// TODO: find a better naming convention for the file that was an index file before
/**
 * The component works as follows: this is a duplicate of the helper-plugin one but without the router
 * `1` , 2, 3, ... 10
 * 1, `2`, 3, ... 10
 * 1, 2, `3`, 4, ... 10
 * 1, 2, 3, `4`, 5, ... 10
 * 1, ..,4, `5`, 6, ... 10
 *
 * 1, ...., 8, 9, `10`
 * 1, ...., 8, `9`, 10
 * 1, ...., 7, `8`, 9, 10
 * 1, ... 6, `7`, 8, 9, 10
 */
import { Typography, VisuallyHidden } from '@strapi/design-system';
import { ChevronLeft, ChevronRight } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled, css } from 'styled-components';

import { Pagination, usePagination } from './Pagination';

const PaginationText = styled(Typography)`
  line-height: revert;
`;

const linkWrapperStyles = css<{ $active?: boolean }>`
  padding: ${({ theme }) => theme.spaces[3]};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ $active, theme }) => ($active ? theme.shadows.filterShadow : undefined)};
  text-decoration: none;
  display: flex;
  position: relative;
  outline: none;

  &:after {
    transition-property: all;
    transition-duration: 0.2s;
    border-radius: 8px;
    content: '';
    position: absolute;
    top: -4px;
    bottom: -4px;
    left: -4px;
    right: -4px;
    border: 2px solid transparent;
  }

  &:focus-visible {
    outline: none;

    &:after {
      border-radius: 8px;
      content: '';
      position: absolute;
      top: -5px;
      bottom: -5px;
      left: -5px;
      right: -5px;
      border: 2px solid ${(props) => props.theme.colors.primary600};
    }
  }
`;

const LinkWrapperButton = styled.button<{ $active?: boolean }>`
  ${linkWrapperStyles}
`;

const LinkWrapperDiv = styled.div<{ $active?: boolean }>`
  ${linkWrapperStyles}
`;

LinkWrapperButton.defaultProps = { type: 'button' };

const PageLinkWrapper = styled(LinkWrapperButton)`
  color: ${({ theme, $active }) => ($active ? theme.colors.primary700 : theme.colors.neutral800)};
  background: ${({ theme, $active }) => ($active ? theme.colors.neutral0 : undefined)};

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.filterShadow};
  }
`;

const ActionLinkWrapper = styled(LinkWrapperButton)`
  font-size: 1.1rem;
  svg path {
    fill: ${(p) => (p['aria-disabled'] ? p.theme.colors.neutral300 : p.theme.colors.neutral600)};
  }

  &:focus,
  &:hover {
    svg path {
      fill: ${(p) => (p['aria-disabled'] ? p.theme.colors.neutral300 : p.theme.colors.neutral700)};
    }
  }

  ${(p) =>
    p['aria-disabled']
      ? `
  pointer-events: none;
    `
      : undefined}
`;

const DotsWrapper = styled(LinkWrapperDiv)`
  color: ${({ theme }) => theme.colors.neutral800};
`;

interface PaginationLinkProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

interface PageLinkProps extends PaginationLinkProps {
  number: number;
}

const PreviousLink = ({ children, ...props }: PaginationLinkProps) => {
  const { activePage } = usePagination();

  const disabled = activePage === 1;

  return (
    <li>
      <ActionLinkWrapper aria-disabled={disabled} tabIndex={disabled ? -1 : undefined} {...props}>
        <VisuallyHidden>{children}</VisuallyHidden>
        <ChevronLeft aria-hidden />
      </ActionLinkWrapper>
    </li>
  );
};

const NextLink = ({ children, ...props }: PaginationLinkProps) => {
  const { activePage, pageCount } = usePagination();

  const disabled = activePage === pageCount;

  return (
    <li>
      <ActionLinkWrapper aria-disabled={disabled} tabIndex={disabled ? -1 : undefined} {...props}>
        <VisuallyHidden>{children}</VisuallyHidden>
        <ChevronRight aria-hidden />
      </ActionLinkWrapper>
    </li>
  );
};

const PageLink = ({ number, children, ...props }: PageLinkProps) => {
  const { activePage } = usePagination();

  const isActive = activePage === number;

  return (
    <li>
      <PageLinkWrapper {...props} $active={isActive}>
        <VisuallyHidden>{children}</VisuallyHidden>
        <PaginationText aria-hidden variant="pi" fontWeight={isActive ? 'bold' : ''}>
          {number}
        </PaginationText>
      </PageLinkWrapper>
    </li>
  );
};

interface DotsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Dots = ({ children, ...props }: DotsProps) => (
  <li>
    <DotsWrapper {...props} as="div">
      <VisuallyHidden>{children}</VisuallyHidden>
      <PaginationText aria-hidden small>
        …
      </PaginationText>
    </DotsWrapper>
  </li>
);

interface PaginationFooterProps {
  activePage: number;
  onChangePage: (page: number) => void;
  pagination: {
    pageCount: number;
  };
}

export const PaginationFooter = ({
  activePage,
  onChangePage,
  pagination: { pageCount },
}: PaginationFooterProps) => {
  const { formatMessage } = useIntl();

  const previousActivePage = activePage - 1;
  const nextActivePage = activePage + 1;

  const firstLinks = [
    <PageLink
      key={1}
      number={1}
      onClick={() => {
        onChangePage(1);
      }}
    >
      {formatMessage(
        { id: 'components.pagination.go-to', defaultMessage: 'Go to page {page}' },
        { page: 1 }
      )}
    </PageLink>,
  ];

  if (pageCount <= 4) {
    const links = Array.from({ length: pageCount })
      .map((_, i) => i + 1)
      .map((number) => {
        return (
          <PageLink key={number} number={number} onClick={() => onChangePage(number)}>
            {formatMessage(
              { id: 'components.pagination.go-to', defaultMessage: 'Go to page {page}' },
              { page: number }
            )}
          </PageLink>
        );
      });

    return (
      <Pagination activePage={activePage} pageCount={pageCount}>
        <PreviousLink onClick={() => onChangePage(previousActivePage)}>
          {formatMessage({
            id: 'components.pagination.go-to-previous',
            defaultMessage: 'Go to previous page',
          })}
        </PreviousLink>
        {links}
        <NextLink onClick={() => onChangePage(nextActivePage)}>
          {formatMessage({
            id: 'components.pagination.go-to-next',
            defaultMessage: 'Go to next page',
          })}
        </NextLink>
      </Pagination>
    );
  }

  let firstLinksToCreate: number[] = [];
  const lastLinks: JSX.Element[] = [];
  let lastLinksToCreate: number[] = [];
  const middleLinks: JSX.Element[] = [];

  if (pageCount > 1) {
    lastLinks.push(
      <PageLink key={pageCount} number={pageCount} onClick={() => onChangePage(pageCount)}>
        {formatMessage(
          { id: 'components.pagination.go-to', defaultMessage: 'Go to page {page}' },
          { page: pageCount }
        )}
      </PageLink>
    );
  }

  if (activePage === 1 && pageCount >= 3) {
    firstLinksToCreate = [2];
  }

  if (activePage === 2 && pageCount >= 3) {
    if (pageCount === 5) {
      firstLinksToCreate = [2, 3, 4];
    } else if (pageCount === 3) {
      firstLinksToCreate = [2];
    } else {
      firstLinksToCreate = [2, 3];
    }
  }

  if (activePage === 4 && pageCount >= 3) {
    firstLinksToCreate = [2];
  }

  if (activePage === pageCount && pageCount >= 3) {
    lastLinksToCreate = [pageCount - 1];
  }

  if (activePage === pageCount - 2 && pageCount > 3) {
    lastLinksToCreate = [activePage + 1, activePage, activePage - 1];
  }

  if (activePage === pageCount - 3 && pageCount > 3 && activePage > 5) {
    lastLinksToCreate = [activePage + 2, activePage + 1, activePage, activePage - 1];
  }

  if (activePage === pageCount - 1 && pageCount > 3) {
    lastLinksToCreate = [activePage, activePage - 1];
  }

  lastLinksToCreate.forEach((number) => {
    lastLinks.unshift(
      <PageLink key={number} number={number} onClick={() => onChangePage(number)}>
        Go to page {number}
      </PageLink>
    );
  });

  firstLinksToCreate.forEach((number) => {
    firstLinks.push(
      <PageLink key={number} number={number} onClick={() => onChangePage(number)}>
        {formatMessage(
          { id: 'components.pagination.go-to', defaultMessage: 'Go to page {page}' },
          { page: number }
        )}
      </PageLink>
    );
  });

  if (
    ![1, 2].includes(activePage) &&
    activePage <= pageCount - 3 &&
    firstLinks.length + lastLinks.length < 6
  ) {
    const middleLinksToCreate = [activePage - 1, activePage, activePage + 1];

    middleLinksToCreate.forEach((number) => {
      middleLinks.push(
        <PageLink key={number} number={number} onClick={() => onChangePage(number)}>
          {formatMessage(
            { id: 'components.pagination.go-to', defaultMessage: 'Go to page {page}' },
            { page: number }
          )}
        </PageLink>
      );
    });
  }

  const shouldShowDotsAfterFirstLink =
    pageCount > 5 || (pageCount === 5 && (activePage === 1 || activePage === 5));
  const shouldShowMiddleDots = middleLinks.length > 2 && activePage > 4 && pageCount > 5;

  const beforeDotsLinksLength = shouldShowMiddleDots
    ? pageCount - activePage - 1
    : pageCount - firstLinks.length - lastLinks.length;
  const afterDotsLength = shouldShowMiddleDots
    ? pageCount - firstLinks.length - lastLinks.length
    : pageCount - activePage - 1;

  return (
    <Pagination activePage={activePage} pageCount={pageCount}>
      <PreviousLink onClick={() => onChangePage(previousActivePage)}>
        {formatMessage({
          id: 'components.pagination.go-to-previous',
          defaultMessage: 'Go to previous page',
        })}
      </PreviousLink>
      {firstLinks}
      {shouldShowMiddleDots && (
        <Dots>
          {formatMessage(
            {
              id: 'components.pagination.remaining-links',
              defaultMessage: 'And {number} other links',
            },
            { number: beforeDotsLinksLength }
          )}
        </Dots>
      )}
      {middleLinks}
      {shouldShowDotsAfterFirstLink && (
        <Dots>
          {formatMessage(
            {
              id: 'components.pagination.remaining-links',
              defaultMessage: 'And {number} other links',
            },
            { number: afterDotsLength }
          )}
        </Dots>
      )}
      {lastLinks}
      <NextLink onClick={() => onChangePage(nextActivePage)}>
        {formatMessage({
          id: 'components.pagination.go-to-next',
          defaultMessage: 'Go to next page',
        })}
      </NextLink>
    </Pagination>
  );
};
