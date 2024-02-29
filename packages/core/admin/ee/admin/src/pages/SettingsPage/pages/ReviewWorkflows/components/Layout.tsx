import * as React from 'react';

import { ContentLayout, HeaderLayout, Layout, Main } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { ArrowLeft } from '@strapi/icons';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { DragLayer } from '../../../../../../../../admin/src/components/DragLayer';
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

type BackProps = {
  href: string;
};
const Back: React.FC<BackProps> = ({ href }) => {
  const { formatMessage } = useIntl();

  return (
    // @ts-expect-error – the `as` prop does not correctly infer the props of it's component
    <Link as={NavLink} startIcon={<ArrowLeft />} to={href}>
      {formatMessage({
        id: 'global.back',
        defaultMessage: 'Back',
      })}
    </Link>
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
      <Helmet
        title={formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: title,
          }
        )}
      />
      <HeaderLayout
        navigationAction={navigationAction}
        primaryAction={primaryAction}
        title={title}
        subtitle={subtitle}
      />
    </>
  );
};

export { Back, DragLayerRendered, Header, Root };
