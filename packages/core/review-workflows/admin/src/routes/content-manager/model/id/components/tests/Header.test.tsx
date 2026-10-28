import { render as renderRTL, screen } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { Header } from '../Header';

import type { DocumentActionProps } from '@strapi/content-manager/strapi-admin';

jest.mock('@strapi/content-manager/strapi-admin', () => ({
  unstable_useDocumentLayout: () => ({ edit: { options: { reviewWorkflows: true } } }),
}));

jest.mock('../AssigneeSelect', () => ({ AssigneeSelect: () => <span>Assignee select</span> }));
jest.mock('../StageSelect', () => ({ StageSelect: () => <span>Stage select</span> }));

const render = (props: Partial<Pick<DocumentActionProps, 'activeTab'>> = {}) =>
  renderRTL(<Header {...props} />, {
    renderOptions: {
      wrapper: ({ children }) => (
        <Routes>
          <Route path="/content-manager/:collectionType/:slug/:id/preview" element={children} />
        </Routes>
      ),
    },
    initialEntries: ['/content-manager/collection-types/api::address.address/1234/preview'],
  });

beforeEach(() => {
  window.strapi.isEE = true;
});

afterEach(() => {
  window.strapi.isEE = false;
});

describe('Header', () => {
  it('renders the assignee and stage selects on the draft tab', () => {
    render({ activeTab: 'draft' });

    expect(screen.getByText('Assignee select')).toBeInTheDocument();
    expect(screen.getByText('Stage select')).toBeInTheDocument();
  });

  it('renders the assignee and stage selects when the active tab is not passed', () => {
    render();

    expect(screen.getByText('Assignee select')).toBeInTheDocument();
    expect(screen.getByText('Stage select')).toBeInTheDocument();
  });

  it('renders nothing on the published tab', () => {
    render({ activeTab: 'published' });

    expect(screen.queryByText('Assignee select')).not.toBeInTheDocument();
    expect(screen.queryByText('Stage select')).not.toBeInTheDocument();
  });
});
