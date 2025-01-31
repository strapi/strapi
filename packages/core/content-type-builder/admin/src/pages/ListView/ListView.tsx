import { BackButton, useTracking, Layouts } from '@strapi/admin/strapi-admin';
import { Box, Button, Flex } from '@strapi/design-system';
import { Pencil, Plus } from '@strapi/icons';
import get from 'lodash/get';
import has from 'lodash/has';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';
import { styled } from 'styled-components';

import { useDataManager } from '../../components/DataManager/useDataManager';
import { useFormModalNavigation } from '../../components/FormModalNavigation/useFormModalNavigation';
import { List } from '../../components/List';
import { ListRow } from '../../components/ListRow';
import { getAttributeDisplayedType } from '../../utils/getAttributeDisplayedType';
import { getTrad } from '../../utils/getTrad';

import { EmptyState } from './EmptyState';
import { LinkToCMSettingsView } from './LinkToCMSettingsView';

import type { SchemaType } from '../../types';
import type { Internal } from '@strapi/types';

const LayoutsHeaderCustom = styled(Layouts.Header)`
  overflow-wrap: anywhere;
`;

const ListView = () => {
  const { isInDevelopmentMode, contentTypes, components } = useDataManager();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  const { contentTypeUid, componentUid } = useParams<{
    contentTypeUid: Internal.UID.ContentType | 'create-content-type';
    componentUid: Internal.UID.Component;
  }>();

  const {
    onOpenModalAddComponentsToDZ,
    onOpenModalAddField,
    onOpenModalEditField,
    onOpenModalEditSchema,
    onOpenModalEditCustomField,
  } = useFormModalNavigation();

  if (contentTypeUid === 'create-content-type') {
    return <EmptyState />;
  }

  const type = contentTypeUid
    ? contentTypes[contentTypeUid]
    : componentUid
      ? components[componentUid]
      : null;

  if (!type) {
    return null;
  }

  const isTemporary = get(type, ['isTemporary'], false);

  const isFromPlugin = has(type, ['plugin']);

  const forTarget = contentTypeUid ? 'contentType' : 'component';

  const label = get(type, ['schema', 'displayName'], '');

  const canEdit = isInDevelopmentMode && !isFromPlugin;

  const handleClickAddComponentToDZ = (dynamicZoneTarget?: string) => {
    onOpenModalAddComponentsToDZ({ dynamicZoneTarget, targetUid: type.uid });
  };

  const handleClickEditField = async (
    forTarget: SchemaType,
    targetUid: Internal.UID.Schema,
    attributeName: string,
    type: string,
    customField: any
  ) => {
    const attributeType = getAttributeDisplayedType(type);
    const step = type === 'component' ? '2' : null;

    if (customField) {
      onOpenModalEditCustomField({
        forTarget,
        targetUid,
        attributeName,
        attributeType,
        customFieldUid: customField,
      });
    } else {
      onOpenModalEditField({
        forTarget,
        targetUid,
        attributeName,
        attributeType,
        step,
      });
    }
  };

  const onEdit = () => {
    if (type?.schema?.kind === 'collectionType') {
      trackUsage('willEditNameOfContentType');
    }

    if (type?.schema?.kind === 'singleType') {
      trackUsage('willEditNameOfSingleType');
    }

    onOpenModalEditSchema({
      modalType: forTarget,
      forTarget: forTarget,
      targetUid: type.uid,
      kind: type?.schema?.kind,
    });
  };

  const primaryAction = isInDevelopmentMode && (
    <Flex gap={2} marginLeft={2}>
      {
        <Button
          startIcon={<Plus />}
          variant="secondary"
          minWidth="max-content"
          onClick={() => {
            onOpenModalAddField({ forTarget, targetUid: type.uid });
          }}
        >
          {formatMessage({
            id: getTrad('button.attributes.add.another'),
            defaultMessage: 'Add another field',
          })}
        </Button>
      }
      <LinkToCMSettingsView key="link-to-cm-settings-view" type={type} disabled={isTemporary} />
      <Button startIcon={<Pencil />} variant="tertiary" onClick={onEdit} disabled={!canEdit}>
        {formatMessage({
          id: 'app.utils.edit',
          defaultMessage: 'Edit',
        })}
      </Button>
    </Flex>
  );

  return (
    <>
      <LayoutsHeaderCustom
        id="title"
        primaryAction={primaryAction}
        title={upperFirst(label)}
        subtitle={formatMessage({
          id: getTrad('listView.headerLayout.description'),
          defaultMessage: 'Build the data architecture of your content',
        })}
        navigationAction={<BackButton />}
      />
      <Layouts.Content>
        <Box background="neutral0" shadow="filterShadow" hasRadius>
          <List
            type={type}
            customRowComponent={(props) => <ListRow {...props} onClick={handleClickEditField} />}
            addComponentToDZ={handleClickAddComponentToDZ}
            isMain
          />
        </Box>
      </Layouts.Content>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default ListView;
