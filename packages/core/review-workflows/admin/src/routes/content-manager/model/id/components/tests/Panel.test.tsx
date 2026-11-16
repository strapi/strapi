import { render, renderHook, screen } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { Panel } from '../Panel';

import type { PanelComponentProps } from '@strapi/content-manager/strapi-admin';

jest.mock('@strapi/content-manager/strapi-admin', () => ({
  unstable_useDocumentLayout: () => ({ edit: { options: { reviewWorkflows: true } } }),
}));

jest.mock('../AssigneeSelect', () => ({ AssigneeSelect: () => <span>Assignee select</span> }));
jest.mock('../StageSelect', () => ({ StageSelect: () => <span>Stage select</span> }));

const renderPanel = (activeTab: PanelComponentProps['activeTab']) =>
  renderHook(
    () =>
      Panel({
        activeTab,
        collectionType: 'collection-types',
        model: 'api::address.address',
        documentId: '1234',
      }),
    {
      wrapper: ({ children }) => (
        <Routes>
          <Route path="/content-manager/:collectionType/:slug/:id" element={children} />
        </Routes>
      ),
      initialEntries: ['/content-manager/collection-types/api::address.address/1234'],
    }
  );

beforeEach(() => {
  window.strapi.isEE = true;
});

afterEach(() => {
  window.strapi.isEE = false;
});

describe('Panel', () => {
  it('renders the assignee and stage selects on the draft tab', () => {
    const { result } = renderPanel('draft');

    expect(result.current).toMatchObject({ title: 'Review Workflows' });

    render(<>{result.current?.content}</>);

    expect(screen.getByText('Assignee select')).toBeInTheDocument();
    expect(screen.getByText('Stage select')).toBeInTheDocument();
  });

  it('renders nothing on the published tab', () => {
    const { result } = renderPanel('published');

    expect(result.current).toBeNull();
  });
});
