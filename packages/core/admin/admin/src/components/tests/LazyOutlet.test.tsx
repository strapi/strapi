import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigation } from 'react-router-dom';

import { LazyOutlet } from '../LazyOutlet';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigation: jest.fn(),
}));

const mockUseNavigation = jest.mocked(useNavigation);

const idleNavigation = {
  state: 'idle' as const,
  location: undefined,
  formMethod: undefined,
  formAction: undefined,
  formEncType: undefined,
  formData: undefined,
  json: undefined,
  text: undefined,
};

const loadingNavigation = { ...idleNavigation, state: 'loading' as const };

describe('LazyOutlet', () => {
  beforeEach(() => {
    mockUseNavigation.mockReturnValue(idleNavigation);
  });

  it('renders child routes when navigation is idle', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LazyOutlet />}>
            <Route index element={<div>Child route</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Child route')).toBeInTheDocument();
  });

  it('shows full-page loading while navigation is loading', () => {
    mockUseNavigation.mockReturnValue(loadingNavigation);

    render(
      <MemoryRouter>
        <LazyOutlet />
      </MemoryRouter>
    );

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Loading content.')).toBeInTheDocument();
  });

  it('shows compact loading in nested layouts while navigation is loading', () => {
    mockUseNavigation.mockReturnValue(loadingNavigation);

    render(
      <MemoryRouter>
        <LazyOutlet nested />
      </MemoryRouter>
    );

    expect(screen.queryByRole('main')).not.toBeInTheDocument();
    expect(screen.getByText('Loading content.')).toBeInTheDocument();
  });

  it('hides stale child routes while navigation is loading', () => {
    mockUseNavigation.mockReturnValue(loadingNavigation);

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LazyOutlet nested />}>
            <Route index element={<div>Child route</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByText('Child route')).not.toBeInTheDocument();
    expect(screen.getByText('Loading content.')).toBeInTheDocument();
  });

  it('keeps rendering child routes during navigation when suspenseOnly is set', () => {
    mockUseNavigation.mockReturnValue(loadingNavigation);

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LazyOutlet suspenseOnly />}>
            <Route index element={<div>Child route</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Child route')).toBeInTheDocument();
  });
});
