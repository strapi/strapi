import { render as renderRTL, screen } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { CellContent } from '../CellContent';

import type { CellContentProps } from '../CellContent';

const render = (overrides: Partial<CellContentProps> = {}) => {
  // Minimal valid props for the string cell branch; cast as the full union shape
  // is heavier than this focused test needs.
  const props = {
    content: 'My entry title',
    rowId: 'doc-1',
    name: 'title',
    attribute: { type: 'string' },
    ...overrides,
  } as CellContentProps;

  return renderRTL(<CellContent {...props} />, {
    renderOptions: {
      wrapper({ children }) {
        return (
          <Routes>
            <Route path="/content-manager/:collectionType/:slug/*" element={children} />
          </Routes>
        );
      },
    },
    initialEntries: ['/content-manager/collection-types/api::address.address'],
  });
};

describe('CellContent', () => {
  it('renders a plain value (no link) when linkTo is not provided', () => {
    render({});

    expect(screen.getByText('My entry title')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders the value as a navigational link to the entry when linkTo is provided', () => {
    render({ linkTo: { pathname: 'doc-1', search: 'plugins[i18n][locale]=en' } });

    const link = screen.getByRole('link', { name: 'My entry title' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining('doc-1'));
    expect(link).toHaveAttribute('href', expect.stringContaining('plugins'));
  });

  it('does not link an empty primary value (renders the dash fallback)', () => {
    render({ content: '', linkTo: { pathname: 'doc-1' } });

    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
