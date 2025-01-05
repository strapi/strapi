import { Page } from '@strapi/strapi/admin';
import { Routes, Route } from 'react-router-dom';
import { WelcomePage } from './WelcomePage';
import { Suspense } from 'react';
import ArrangePage from './ArrangePage';
import { GroupAndArrangeContextProvider } from '../components/GroupAndArrangeContextProvider';

const withGroupAndArrangeContext = (Component: React.ComponentType) => {
  return (props: any) => (
    <GroupAndArrangeContextProvider>
      <Component {...props} />
    </GroupAndArrangeContextProvider>
  );
};

const WrappedWelcomePage = withGroupAndArrangeContext(WelcomePage);
const WrappedArrangePage = withGroupAndArrangeContext(ArrangePage);

const App = () => {
  return (
    <Suspense fallback={<Page.Loading />}>
      <Routes>
        <Route index element={<WrappedWelcomePage />} />
        <Route path="/:uid" element={<WrappedWelcomePage />} />
        <Route path="/:uid/:groupField/:groupName" element={<WrappedArrangePage />} />
      </Routes>
    </Suspense>
  );
};

export { App };
