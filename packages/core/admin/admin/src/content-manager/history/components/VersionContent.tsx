import * as React from 'react';

import { ContentLayout } from '@strapi/design-system';

import { Form } from '../../components/Form';
import { FormLayout } from '../../pages/EditView/components/FormLayout';
import { useHistoryContext } from '../pages/History';

// These types will be added in future PRs, they need special handling
const UNSUPPORTED_TYPES = ['media', 'relation'];

const VersionContent = () => {
  const { version, layout } = useHistoryContext('VersionContent', (state) => ({
    version: state.selectedVersion,
    layout: state.layout,
  }));

  return (
    <ContentLayout>
      <Form disabled={true} method="PUT" initialValues={version}>
        <FormLayout layout={layout} />
      </Form>
    </ContentLayout>
  );
};

export { VersionContent };
