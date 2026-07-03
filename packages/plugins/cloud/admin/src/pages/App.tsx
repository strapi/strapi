/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import { Page, useAppInfo } from '@strapi/strapi/admin';
import { Navigate, Routes, Route } from 'react-router-dom';

import { HomePage } from './HomePage';

const App = () => {
  const currentEnvironment = useAppInfo('CloudApp', (state) => state.currentEnvironment);

  if (currentEnvironment === 'production') {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="*" element={<Page.Error />} />
      </Routes>
    </div>
  );
};

export { App };
