import React from 'react';
import { useTracking, Link } from '@strapi/helper-plugin';
import Plus from '@strapi/icons/Plus';
import ArrowLeft from '@strapi/icons/ArrowLeft';
import Check from '@strapi/icons/Check';
import Pencil from '@strapi/icons/Pencil';
import { Button, Flex, Stack, Box, ContentLayout, HeaderLayout } from '@strapi/design-system';
import get from 'lodash/get';
import has from 'lodash/has';
import isEqual from 'lodash/isEqual';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import { Prompt, useRouteMatch } from 'react-router-dom';
import List from '../../components/List';
import ListRow from '../../components/ListRow';
import useDataManager from '../../hooks/useDataManager';
import useFormModalNavigation from '../../hooks/useFormModalNavigation';
import getAttributeDisplayedType from '../../utils/getAttributeDisplayedType';
import getTrad from '../../utils/getTrad';
import LinkToCMSettingsView from './LinkToCMSettingsView';

/* eslint-disable indent */

const ListView = () => {
  const { initialData, modifiedData, isInDevelopmentMode, isInContentTypeView, submitData } =
    useDataManager();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  const match = useRouteMatch('/plugins/content-type-builder/:kind/:currentUID');

  const {
    onOpenModalAddComponentsToDZ,
    onOpenModalAddField,
    onOpenModalEditField,
    onOpenModalEditSchema,
    onOpenModalEditCustomField,
  } = useFormModalNavigation();

  const firstMainDataPath = isInContentTypeView ? 'contentType' : 'component';
  const mainDataTypeAttributesPath = [firstMainDataPath, 'schema', 'attributes'];
  const targetUid = get(modifiedData, [firstMainDataPath, 'uid']);
  const isTemporary = get(modifiedData, [firstMainDataPath, 'isTemporary'], false);
  const contentTypeKind = get(modifiedData, [firstMainDataPath, 'schema', 'kind'], null);

  const attributes = get(modifiedData, mainDataTypeAttributesPath, []);
  const isFromPlugin = has(initialData, [firstMainDataPath, 'plugin']);
  const hasModelBeenModified = !isEqual(modifiedData, initialData);

  const forTarget = isInContentTypeView ? 'contentType' : 'component';

  const handleClickAddComponentToDZ = (dynamicZoneTarget) => {
    onOpenModalAddComponentsToDZ({ dynamicZoneTarget, targetUid });
  };

  const handleClickEditField = async (forTarget, targetUid, attributeName, type, customField) => {
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

  let label = get(modifiedData, [firstMainDataPath, 'schema', 'displayName'], '');
  const kind = get(modifiedData, [firstMainDataPath, 'schema', 'kind'], '');

  const isCreatingFirstContentType = match?.params.currentUID === 'create-content-type';

  if (!label && isCreatingFirstContentType) {
    label = formatMessage({
      id: getTrad('button.model.create'),
      defaultMessage: 'Create new collection type',
    });
  }

  const onEdit = () => {
    const contentType = kind || firstMainDataPath;

    if (contentType === 'collectionType') {
      trackUsage('willEditNameOfContentType');
    }
    if (contentType === 'singleType') {
      trackUsage('willEditNameOfSingleType');
    }

    onOpenModalEditSchema({
      modalType: firstMainDataPath,
      forTarget: firstMainDataPath,
      targetUid,
      kind: contentType,
    });
  };

  return (
    <>
      <Prompt
        message={formatMessage({ id: getTrad('prompt.unsaved') })}
        when={hasModelBeenModified}
      />
      <HeaderLayout
        id="title"
        primaryAction={
          isInDevelopmentMode && (
            <Stack horizontal spacing={2}>
              {/* DON'T display the add field button when the content type has not been created */}
              {!isCreatingFirstContentType && (
                <Button
                  startIcon={<Plus />}
                  variant="secondary"
                  onClick={() => {
                    onOpenModalAddField({ forTarget, targetUid });
                  }}
                >
                  {formatMessage({ id: getTrad('button.attributes.add.another') })}
                </Button>
              )}
              <Button
                startIcon={<Check />}
                onClick={() => submitData()}
                type="submit"
                disabled={isEqual(modifiedData, initialData)}
              >
                {formatMessage({
                  id: 'global.save',
                  defaultMessage: 'Save',
                })}
              </Button>
            </Stack>
          )
        }
        secondaryAction={
          isInDevelopmentMode &&
          !isFromPlugin &&
          !isCreatingFirstContentType && (
            <Button startIcon={<Pencil />} variant="tertiary" onClick={onEdit}>
              {formatMessage({
                id: 'app.utils.edit',
                defaultMessage: 'Edit',
              })}
            </Button>
          )
        }
        title={upperFirst(label)}
        subtitle={formatMessage({
          id: getTrad('listView.headerLayout.description'),
          defaultMessage: 'Build the data architecture of your content',
        })}
        navigationAction={
          <Link startIcon={<ArrowLeft />} to="/plugins/content-type-builder/">
            {formatMessage({
              id: 'global.back',
              defaultMessage: 'Back',
            })}
          </Link>
        }
      />
      <ContentLayout>
        <Stack spacing={4}>
          <Flex justifyContent="flex-end">
            <Stack horizontal spacing={2}>
              <LinkToCMSettingsView
                key="link-to-cm-settings-view"
                targetUid={targetUid}
                isTemporary={isTemporary}
                isInContentTypeView={isInContentTypeView}
                contentTypeKind={contentTypeKind}
                disabled={isCreatingFirstContentType}
              />
            </Stack>
          </Flex>
          <Box background="neutral0" shadow="filterShadow" hasRadius>
            <List
              items={attributes}
              customRowComponent={(props) => <ListRow {...props} onClick={handleClickEditField} />}
              addComponentToDZ={handleClickAddComponentToDZ}
              targetUid={targetUid}
              editTarget={forTarget}
              isMain
            />
          </Box>
        </Stack>
      </ContentLayout>
    </>
  );
};

export default ListView;
