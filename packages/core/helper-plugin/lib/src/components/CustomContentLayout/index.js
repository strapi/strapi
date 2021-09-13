import React, { useEffect } from 'react';
import { ContentLayout } from '@strapi/parts/Layout';
import PropTypes from 'prop-types';
import EmptyStateLayout from '../EmptyStateLayout';

// TODO: REMOVE this component
const CustomContentLayout = ({ action, canRead, children, shouldShowEmptyState }) => {
  useEffect(() => {
    console.error(
      'This component will soon be removed, please check out the PageTemplate in the storybook'
    );
  }, []);

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
  children: null,
  shouldShowEmptyState: false,
};

CustomContentLayout.propTypes = {
  action: PropTypes.any,
  canRead: PropTypes.bool,
  children: PropTypes.any,
  shouldShowEmptyState: PropTypes.bool,
};

export default CustomContentLayout;
