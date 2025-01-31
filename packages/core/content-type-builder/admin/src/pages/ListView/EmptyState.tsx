import { BackButton, Layouts } from '@strapi/admin/strapi-admin';
import { EmptyStateLayout } from '@strapi/design-system';
import { EmptyDocuments } from '@strapi/icons/symbols';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils/getTrad';

export const EmptyState = () => {
  const { formatMessage } = useIntl();

  const createNewLabel = formatMessage({
    id: getTrad('button.model.create'),
    defaultMessage: 'Create new collection type',
  });

  return (
    <>
      <Layouts.Header
        id="title"
        primaryAction={null}
        title={upperFirst(createNewLabel)}
        subtitle={formatMessage({
          id: getTrad('listView.headerLayout.description'),
          defaultMessage: 'Build the data architecture of your content',
        })}
        navigationAction={<BackButton />}
      />
      <Layouts.Content>
        <EmptyStateLayout
          content={formatMessage({
            id: getTrad('table.content.create-first-content-type'),
            defaultMessage: 'Create your first Collection-Type',
          })}
          hasRadius
          icon={<EmptyDocuments width="16rem" />}
        />
      </Layouts.Content>
    </>
  );
};
