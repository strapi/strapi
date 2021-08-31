import React from 'react';
import { ContentLayout } from '@strapi/parts/Layout';
import PropTypes from 'prop-types';
import EmptyStateLayout from '../EmptyStateLayout';

const CustomContentLayout = ({ action, canRead, children, shouldShowEmptyState }) => {
  if (!canRead) {
    return (
      <ContentLayout>
        <EmptyStateLayout
          icon="permissions"
          content={{
            // TODO
            id: 'app.components.EmptyStateLayout.content-permissions',
            defaultMessage: "You don't have the permissions to access that content",
          }}
        />
      </ContentLayout>
    );
  }

  if (shouldShowEmptyState) {
    return (
      <ContentLayout>
        <EmptyStateLayout action={action} />
      </ContentLayout>
    );
  }

  return <ContentLayout>{children}</ContentLayout>;
};

CustomContentLayout.defaultProps = {
  action: undefined,
  canRead: true,
  shouldShowEmptyState: false,
};

CustomContentLayout.propTypes = {
  action: PropTypes.any,
  canRead: PropTypes.bool,
  children: PropTypes.node.isRequired,
  shouldShowEmptyState: PropTypes.bool,
};

export default CustomContentLayout;
