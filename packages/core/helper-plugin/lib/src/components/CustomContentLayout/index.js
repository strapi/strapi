import React from 'react';
import { ContentLayout } from '@strapi/parts/Layout';
import PropTypes from 'prop-types';
import EmptyStateLayout from '../EmptyStateLayout';
import LoadingIndicatorPage from '../LoadingIndicatorPage';

const CustomContentLayout = ({
  action,
  canRead,
  children,
  isLoading,
  shouldShowEmptyState,
  ...rest
}) => {
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

  if (isLoading) {
    return (
      <ContentLayout>
        <LoadingIndicatorPage {...rest} />
      </ContentLayout>
    );
  }

  return <ContentLayout>{children}</ContentLayout>;
};

CustomContentLayout.defaultProps = {
  action: undefined,
  canRead: true,
  children: null,
  isLoading: false,
  shouldShowEmptyState: false,
};

CustomContentLayout.propTypes = {
  action: PropTypes.any,
  canRead: PropTypes.bool,
  children: PropTypes.any,
  isLoading: PropTypes.bool,
  shouldShowEmptyState: PropTypes.bool,
};

export default CustomContentLayout;
