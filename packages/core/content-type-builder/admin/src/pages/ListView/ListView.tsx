/* eslint-disable import/no-default-export */
import { Layouts, tours } from '@strapi/admin/strapi-admin';
import { Box, Button, Flex, Typography } from '@strapi/design-system';
import { Information, Pencil, Plus } from '@strapi/icons';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import { Navigate, useParams } from 'react-router-dom';
import { styled } from 'styled-components';

import { useCTBTracking } from '../../components/CTBSession/ctbSession';
import { useDataManager } from '../../components/DataManager/useDataManager';
import { useFormModalNavigation } from '../../components/FormModalNavigation/useFormModalNavigation';
import { List } from '../../components/List';
import { getTrad } from '../../utils/getTrad';

import { LinkToCMSettingsView } from './LinkToCMSettingsView';

import type { Internal } from '@strapi/types';

const LayoutsHeaderCustom = styled(Layouts.Header)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ListView = () => {
  const { isInDevelopmentMode, contentTypes, components, isLoading } = useDataManager();
  const { formatMessage } = useIntl();
  const { trackUsage } = useCTBTracking();

  const { contentTypeUid, componentUid } = useParams<{
    contentTypeUid: Internal.UID.ContentType;
    componentUid: Internal.UID.Component;
  }>();

  const { onOpenModalAddComponentsToDZ, onOpenModalAddField, onOpenModalEditSchema } =
    useFormModalNavigation();

  const type = contentTypeUid
    ? contentTypes[contentTypeUid]
    : componentUid
      ? components[componentUid]
      : null;

  if (isLoading) {
    return null;
  }

  if (!type) {
    const allowedEndpoints = Object.values(contentTypes)
      .filter((ct) => ct.visible === true && !ct.plugin)
      .map((ct) => ct.uid)
      .sort();

    if (allowedEndpoints.length > 0) {
      return <Navigate to={`/plugins/content-type-builder/content-types/${allowedEndpoints[0]}`} />;
    }

    return <Navigate to="/plugins/content-type-builder/content-types/create-content-type" />;
  }

  if (contentTypeUid && type.modelType === 'contentType' && type.visible === false) {
    return (
      <Navigate to="/plugins/content-type-builder/content-types/create-content-type" replace />
    );
  }

  const isFromPlugin = 'plugin' in type && type?.plugin !== undefined;

  const forTarget = contentTypeUid ? 'contentType' : 'component';

  const label = type?.info?.displayName ?? '';

  const canEdit = isInDevelopmentMode && !isFromPlugin;

  const handleClickAddComponentToDZ = (dynamicZoneTarget?: string) => {
    onOpenModalAddComponentsToDZ({ dynamicZoneTarget, targetUid: type.uid });
  };

  const onEdit = () => {
    if ('kind' in type) {
      if (type?.kind === 'collectionType') {
        trackUsage('willEditNameOfContentType');
      }

      if (type?.kind === 'singleType') {
        trackUsage('willEditNameOfSingleType');
      }

      onOpenModalEditSchema({
        modalType: forTarget,
        forTarget: forTarget,
        targetUid: type.uid,
        kind: type?.kind,
      });

      return;
    }

    onOpenModalEditSchema({
      modalType: forTarget,
      forTarget: forTarget,
      targetUid: type.uid,
    });
  };

  const addNewFieldLabel = formatMessage({
    id: getTrad('table.button.no-fields'),
    defaultMessage: 'Add new field',
  });

  const addAnotherFieldLabel = formatMessage({
    id: getTrad('button.attributes.add.another'),
    defaultMessage: 'Add another field',
  });

  const isDeleted = type.status === 'REMOVED';

  const primaryAction = isInDevelopmentMode && (
    <Flex gap={2}>
      <LinkToCMSettingsView
        key="link-to-cm-settings-view"
        type={type}
        disabled={type.status === 'NEW' || isDeleted}
      />
      <Button
        startIcon={<Pencil />}
        variant="tertiary"
        onClick={onEdit}
        disabled={!canEdit || isDeleted}
      >
        {formatMessage({
          id: 'app.utils.edit',
          defaultMessage: 'Edit',
        })}
      </Button>

      <Button
        startIcon={<Plus />}
        variant="secondary"
        minWidth="max-content"
        onClick={() => {
          onOpenModalAddField({ forTarget, targetUid: type.uid });
        }}
        disabled={isDeleted}
      >
        {type.attributes.length === 0 ? addNewFieldLabel : addAnotherFieldLabel}
      </Button>
    </Flex>
  );

  return (
    <>
      <tours.contentTypeBuilder.Introduction>
        {/* Invisible Anchor */}
        <Box />
      </tours.contentTypeBuilder.Introduction>
      {isDeleted && (
        <Flex background="danger100" justifyContent={'center'} padding={4}>
          <Flex gap={2}>
            <Information fill="danger600" height="2rem" width="2rem" />
            <Typography>
              {formatMessage(
                {
                  id: getTrad('table.warning.deleted'),
                  defaultMessage: `This {kind} has been deleted`,
                },
                {
                  kind: type.modelType === 'contentType' ? 'Content Type' : 'Component',
                }
              )}
            </Typography>
          </Flex>
        </Flex>
      )}
      <LayoutsHeaderCustom id="title" primaryAction={primaryAction} title={upperFirst(label)} />
      <Layouts.Content>
        <Box
          background="neutral0"
          shadow="filterShadow"
          hasRadius
          overflow="auto"
          borderColor="neutral150"
        >
          <List type={type} addComponentToDZ={handleClickAddComponentToDZ} isMain />
        </Box>
      </Layouts.Content>
    </>
  );
};

export default ListView;
