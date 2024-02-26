import * as React from 'react';

import { ContentLayout } from '@strapi/design-system';
import { useQueryParams } from '@strapi/helper-plugin';

import { Form } from '../../components/Form';
import { DocumentRBAC } from '../../features/DocumentRBAC';
import { useSyncRbac } from '../../hooks/useSyncRbac';
import { FormLayout } from '../../pages/EditView/components/FormLayout';
import { useHistoryContext } from '../pages/History';

// These types will be added in future PRs, they need special handling
const UNSUPPORTED_TYPES = ['media', 'relation'];

const VersionContent = () => {
  const [{ query }] = useQueryParams();
  const { version, layout } = useHistoryContext('VersionContent', (state) => ({
    version: state.selectedVersion,
    layout: state.layout,
  }));
  const { permissions = [] } = useSyncRbac(version.contentType, query, 'VersionContent');

  return (
    <ContentLayout>
      <DocumentRBAC permissions={permissions}>
        <Form disabled={true} method="PUT" initialValues={version.data}>
          <FormLayout layout={layout} />
        </Form>
      </DocumentRBAC>
    </ContentLayout>
  );
};

export { VersionContent };
