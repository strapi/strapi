import { SubNav } from '@strapi/admin/strapi-admin';

import { LeftMenu } from '../components/LeftMenu';

const Navigation = () => {
  return (
    <SubNav.PageWrapper>
      <LeftMenu isFullPage />
    </SubNav.PageWrapper>
  );
};

export { Navigation };
