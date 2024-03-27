import * as React from 'react';

import { ContentLayout, HeaderLayout, Layout, Main } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { DragLayer } from '../../../../../../../../admin/src/components/DragLayer';
import { Page } from '../../../../../../../../admin/src/components/PageHelpers';
import { DRAG_DROP_TYPES } from '../constants';

import { StageDragPreview } from './StageDragPreview';

const DragLayerRendered = () => {
  return (
    <DragLayer
      renderItem={(item) => {
        if (item.type === DRAG_DROP_TYPES.STAGE) {
          return <StageDragPreview name={typeof item.item === 'string' ? item.item : null} />;
        }
      }}
    />
  );
};

const Root: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <Layout>
      <Main tabIndex={-1}>
        <ContentLayout>{children}</ContentLayout>
      </Main>
    </Layout>
  );
};

type HeaderProps = {
  title: string;
  navigationAction?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  subtitle?: React.ReactNode;
};
const Header: React.FC<HeaderProps> = ({ title, subtitle, navigationAction, primaryAction }) => {
  const { formatMessage } = useIntl();
  return (
    <>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: title,
          }
        )}
      </Page.Title>
      <HeaderLayout
        navigationAction={navigationAction}
        primaryAction={primaryAction}
        title={title}
        subtitle={subtitle}
      />
    </>
  );
};

export { DragLayerRendered, Header, Root };
