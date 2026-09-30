import { renderHook } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { Panel } from '../Panel';

import type { PanelComponentProps } from '@strapi/content-manager/strapi-admin';

jest.mock('@strapi/content-manager/strapi-admin', () => ({
  unstable_useDocumentLayout: jest.fn(() => ({ edit: { options: { reviewWorkflows: true } } })),
}));

jest.mock('../AssigneeSelect', () => ({ AssigneeSelect: () => null }));
jest.mock('../StageSelect', () => ({ StageSelect: () => null }));

const renderPanel = () =>
  renderHook(() => Panel({} as PanelComponentProps), {
    wrapper: ({ children }) => (
      <Routes>
        <Route path="/content-manager/:collectionType/:slug/:id" element={children} />
      </Routes>
    ),
    initialEntries: ['/content-manager/collection-types/api::address.address/1234'],
  });

describe('Review workflows Panel', () => {
  const originalIsEnabled = window.strapi.features.isEnabled;
  const originalIsEE = window.strapi.isEE;

  beforeEach(() => {
    window.strapi.isEE = true;
  });

  afterEach(() => {
    window.strapi.isEE = originalIsEE;
    window.strapi.features.isEnabled = originalIsEnabled;
  });

  it('renders the panel with the review-workflows feature', () => {
    window.strapi.features.isEnabled = (name) => name === 'review-workflows';

    const { result } = renderPanel();

    expect(result.current).toMatchObject({ title: 'Review Workflows' });
  });

  it('renders nothing when the license lacks the review-workflows feature', () => {
    window.strapi.features.isEnabled = () => false;

    const { result } = renderPanel();

    expect(result.current).toBeNull();
  });
});
