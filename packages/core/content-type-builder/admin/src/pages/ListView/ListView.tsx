import { BackButton, useTracking, Layouts } from '@strapi/admin/strapi-admin';
import { Box, Button, Flex } from '@strapi/design-system';
import { Check, Pencil, Plus } from '@strapi/icons';
import get from 'lodash/get';
import has from 'lodash/has';
import isEqual from 'lodash/isEqual';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';
import { unstable_usePrompt as usePrompt, useParams } from 'react-router-dom';
import { styled } from 'styled-components';

import { List } from '../../components/List';
import { ListRow } from '../../components/ListRow';
import { useDataManager } from '../../hooks/useDataManager';
import { useFormModalNavigation } from '../../hooks/useFormModalNavigation';
import { getAttributeDisplayedType } from '../../utils/getAttributeDisplayedType';
import { getTrad } from '../../utils/getTrad';

import { LinkToCMSettingsView } from './LinkToCMSettingsView';

import type { SchemaType } from '../../types';
import type { Internal } from '@strapi/types';

const LayoutsHeaderCustom = styled(Layouts.Header)`
  overflow-wrap: anywhere;
`;

const ListView = () => {
  const {
    isInDevelopmentMode,
    isInContentTypeView,
    submitData,
    contentTypes,
    components,
    initialData,
  } = useDataManager();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  const { contentTypeUid, componentUid } = useParams();

  const {
    onOpenModalAddComponentsToDZ,
    onOpenModalAddField,
    onOpenModalEditField,
    onOpenModalEditSchema,
    onOpenModalEditCustomField,
  } = useFormModalNavigation();

  const targetUid = (contentTypeUid || componentUid)!;
  const type = isInContentTypeView ? contentTypes[targetUid] : components[targetUid];

  const isTemporary = get(type, ['isTemporary'], false);
  const contentTypeKind = get(type, ['schema', 'kind'], null);

  const attributes = get(type, ['schema', 'attributes'], []);
  const isFromPlugin = has(type, ['plugin']);
  const hasModelBeenModified = false; // !isEqual(modifiedData, initialData);

  const forTarget = isInContentTypeView ? 'contentType' : 'component';

  const isCreatingFirstContentType = contentTypeUid === 'create-content-type';

  let label = get(type, ['schema', 'displayName'], '');
  const kind = get(type, ['schema', 'kind'], '');

  if (!label && isCreatingFirstContentType) {
    label = formatMessage({
      id: getTrad('button.model.create'),
      defaultMessage: 'Create new collection type',
    });
  }

  const canEdit = isInDevelopmentMode && !isFromPlugin && !isCreatingFirstContentType;

  const handleClickAddComponentToDZ = (dynamicZoneTarget?: string) => {
    onOpenModalAddComponentsToDZ({ dynamicZoneTarget, targetUid });
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
    const contentType = kind;

    if (contentType === 'collectionType') {
      trackUsage('willEditNameOfContentType');
    }
    if (contentType === 'singleType') {
      trackUsage('willEditNameOfSingleType');
    }

    onOpenModalEditSchema({
      modalType: forTarget,
      forTarget: forTarget,
      targetUid,
      kind: contentType,
    });
  };

  usePrompt({
    when: hasModelBeenModified,
    message: formatMessage({ id: getTrad('prompt.unsaved'), defaultMessage: 'Are you sure?' }),
  });

  const primaryAction = isInDevelopmentMode && (
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
        disabled={isEqual(
          {
            contentTypes,
            components,
          },
          initialData
        )}
      >
        {formatMessage({
          id: 'global.save',
          defaultMessage: 'Save',
        })}
      </Button>
    </Flex>
  );

  const secondaryAction = canEdit && (
    <Button startIcon={<Pencil />} variant="tertiary" onClick={onEdit}>
      {formatMessage({
        id: 'app.utils.edit',
        defaultMessage: 'Edit',
      })}
    </Button>
  );

  return (
    <>
      <LayoutsHeaderCustom
        id="title"
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
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
                isInContentTypeView={isInContentTypeView}
                contentTypeKind={contentTypeKind}
                disabled={isCreatingFirstContentType || isTemporary}
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
