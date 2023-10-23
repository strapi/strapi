/* eslint-disable react/prop-types */

import * as React from 'react';

import { ContentLayout, HeaderLayout, Layout, Main } from '@strapi/design-system';
import { Link, SettingsPageTitle } from '@strapi/helper-plugin';
import { ArrowLeft } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { DragLayer } from '../../../../../../../../admin/src/components/DragLayer';
import { DRAG_DROP_TYPES } from '../../constants';
import { StageDragPreview } from '../StageDragPreview';

function renderDragLayerItem({ type, item }) {
  switch (type) {
    case DRAG_DROP_TYPES.STAGE:
      return <StageDragPreview {...item} />;

    default:
      return null;
  }
}

function DragLayerRendered() {
  return <DragLayer renderItem={renderDragLayerItem} />;
}

function Root({ children }) {
  return (
    <Layout>
      <Main tabIndex={-1}>
        <ContentLayout>{children}</ContentLayout>
      </Main>
    </Layout>
  );
}

function Back({ href }) {
  const { formatMessage } = useIntl();

  return (
    <Link startIcon={<ArrowLeft />} to={href}>
      {formatMessage({
        id: 'global.back',
        defaultMessage: 'Back',
      })}
    </Link>
  );
}

function Header({ title, subtitle, navigationAction, primaryAction }) {
  return (
    <>
      <SettingsPageTitle name={title} />
      <HeaderLayout
        navigationAction={navigationAction}
        primaryAction={primaryAction}
        title={title}
        subtitle={subtitle}
      />
    </>
  );
}

export { Back, DragLayerRendered, Header, Root };
