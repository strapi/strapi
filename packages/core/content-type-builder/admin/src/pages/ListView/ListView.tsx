import { BackButton, useTracking, Layouts } from '@strapi/admin/strapi-admin';
import { Box, Button, Flex } from '@strapi/design-system';
import { Check, Pencil, Plus } from '@strapi/icons';
import get from 'lodash/get';
import has from 'lodash/has';
import isEqual from 'lodash/isEqual';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import { unstable_usePrompt as usePrompt, useMatch } from 'react-router-dom';
import { styled } from 'styled-components';

import { List } from '../../components/List';
import { ListRow } from '../../components/ListRow';
import { useDataManager } from '../../hooks/useDataManager';
import { useFormModalNavigation } from '../../hooks/useFormModalNavigation';
import { getAttributeDisplayedType } from '../../utils/getAttributeDisplayedType';
import { getTrad } from '../../utils/getTrad';

import { LinkToCMSettingsView } from './LinkToCMSettingsView';

/* eslint-disable indent */

const LayoutsHeaderCustom = styled(Layouts.Header)`
  overflow-wrap: anywhere;
`;

const ListView = () => {
  const { initialData, modifiedData, isInDevelopmentMode, isInContentTypeView, submitData } =
    useDataManager();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  const match = useMatch('/plugins/content-type-builder/:kind/:currentUID');

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

  const handleClickAddComponentToDZ = (dynamicZoneTarget?: string) => {
    onOpenModalAddComponentsToDZ({ dynamicZoneTarget, targetUid });
  };

  const handleClickEditField = async (
    forTarget: string,
    targetUid: string,
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

  usePrompt({
    when: hasModelBeenModified,
    message: formatMessage({ id: getTrad('prompt.unsaved'), defaultMessage: 'Are you sure?' }),
  });

  return (
    <>
      <LayoutsHeaderCustom
        id="title"
        primaryAction={
          isInDevelopmentMode && (
            <Flex gap={2} marginLeft={2}>
              {/* DON'T display the add field button when the content type has not been created */}
              {!isCreatingFirstContentType && (
                <Button
                  startIcon={<Plus />}
                  variant="secondary"
                  minWidth="max-content"
                  onClick={() => {
                    onOpenModalAddField({ forTarget, targetUid });
                  }}
                >
                  {formatMessage({
                    id: getTrad('button.attributes.add.another'),
                    defaultMessage: 'Add another field',
                  })}
                </Button>
              )}
              <Button
                startIcon={<Check />}
                onClick={async () => await submitData()}
                type="submit"
                disabled={isEqual(modifiedData, initialData)}
              >
                {formatMessage({
                  id: 'global.save',
                  defaultMessage: 'Save',
                })}
              </Button>
            </Flex>
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
        navigationAction={<BackButton />}
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={4}>
          <Flex justifyContent="flex-end">
            <Flex gap={2}>
              <LinkToCMSettingsView
                key="link-to-cm-settings-view"
                targetUid={targetUid}
                isTemporary={isTemporary}
                isInContentTypeView={isInContentTypeView}
                contentTypeKind={contentTypeKind}
                disabled={isCreatingFirstContentType}
              />
            </Flex>
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
        </Flex>
      </Layouts.Content>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default ListView;
