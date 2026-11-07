import { Page } from '@strapi/admin/strapi-admin';
import { Route, Routes } from 'react-router-dom';

import { PERMISSIONS } from '../../constants';

import { BuilderPage } from './BuilderPage';
import { ListPage } from './ListPage';
import { ViewPage } from './ViewPage';

/**
 * Everything under `/settings/end-users/conditions`: the list, the builder, which opens a new
 * condition at `new` and a builder condition at its slug, and the read-only page of every other
 * condition at `view/<name>`.
 */
const ConditionsPage = () => {
  return (
    <Page.Protect permissions={PERMISSIONS.conditions.read}>
      <Routes>
        <Route index element={<ListPage />} />
        <Route path="new" element={<BuilderPage />} />
        <Route path="view/:name" element={<ViewPage />} />
        <Route path=":slug" element={<BuilderPage />} />
      </Routes>
    </Page.Protect>
  );
};

export { ConditionsPage };
