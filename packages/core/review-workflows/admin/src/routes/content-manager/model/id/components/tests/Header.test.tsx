import { render, screen } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { Header } from '../Header';

jest.mock('@strapi/content-manager/strapi-admin', () => ({
  unstable_useDocumentLayout: jest.fn(() => ({ edit: { options: { reviewWorkflows: true } } })),
}));

jest.mock('../AssigneeSelect', () => ({ AssigneeSelect: () => 'Assignee select' }));
jest.mock('../StageSelect', () => ({ StageSelect: () => 'Stage select' }));

const renderHeader = () =>
  render(<Header />, {
    renderOptions: {
      wrapper: ({ children }) => (
        <Routes>
          <Route path="/content-manager/:collectionType/:slug/:id" element={children} />
        </Routes>
      ),
    },
    initialEntries: ['/content-manager/collection-types/api::address.address/1234'],
  });

describe('Review workflows preview Header', () => {
  const originalIsEnabled = window.strapi.features.isEnabled;
  const originalIsEE = window.strapi.isEE;

  beforeEach(() => {
    window.strapi.isEE = true;
  });

  afterEach(() => {
    window.strapi.isEE = originalIsEE;
    window.strapi.features.isEnabled = originalIsEnabled;
  });

  it('renders the assignee and stage selects with the review-workflows feature', () => {
    window.strapi.features.isEnabled = (name) => name === 'review-workflows';

    renderHeader();

    expect(screen.getByText(/Assignee select/)).toBeInTheDocument();
    expect(screen.getByText(/Stage select/)).toBeInTheDocument();
  });

  it('renders nothing when the license lacks the review-workflows feature', () => {
    window.strapi.features.isEnabled = () => false;

    renderHeader();

    expect(screen.queryByText(/Assignee select/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Stage select/)).not.toBeInTheDocument();
  });
});
