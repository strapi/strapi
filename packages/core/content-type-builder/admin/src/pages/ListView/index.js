/**
 *  ! Have a discussion with maeva about l.170
 */

import React from 'react';
import { useTracking } from '@strapi/helper-plugin';
import AddIcon from '@strapi/icons/AddIcon';
import BackIcon from '@strapi/icons/BackIcon';
import CheckIcon from '@strapi/icons/CheckIcon';
import EditIcon from '@strapi/icons/EditIcon';
import { Button } from '@strapi/parts/Button';
import { Link } from '@strapi/parts/Link';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { Box } from '@strapi/parts/Box';
import { ContentLayout, HeaderLayout } from '@strapi/parts/Layout';
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
  const {
    initialData,
    modifiedData,
    isInDevelopmentMode,
    isInContentTypeView,
    submitData,
  } = useDataManager();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  // const [enablePrompt, togglePrompt] = useState(true);
  const match = useRouteMatch('/plugins/content-type-builder/:kind/:currentUID');

  const {
    onOpenModalAddComponentsToDZ,
    onOpenModalAddField,
    onOpenModalEditField,
    onOpenModalEditSchema,
  } = useFormModalNavigation();

  // useEffect(() => {
  //   if (search === '') {
  //     togglePrompt(true);
  //   }
  // }, [search]);

  // Disabling the prompt on the first render if one of the modal is open
  // useEffect(() => {
  //   if (search !== '') {
  //     togglePrompt(false);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  const firstMainDataPath = isInContentTypeView ? 'contentType' : 'component';
  const mainDataTypeAttributesPath = [firstMainDataPath, 'schema', 'attributes'];
  const targetUid = get(modifiedData, [firstMainDataPath, 'uid']);
  const isTemporary = get(modifiedData, [firstMainDataPath, 'isTemporary'], false);
  const contentTypeKind = get(modifiedData, [firstMainDataPath, 'schema', 'kind'], null);

  const attributes = get(modifiedData, mainDataTypeAttributesPath, []);
  const currentDataName = get(initialData, [firstMainDataPath, 'schema', 'name'], '');
  const isFromPlugin = has(initialData, [firstMainDataPath, 'plugin']);
  // const hasModelBeenModified = !isEqual(modifiedData, initialData);
  const forTarget = isInContentTypeView ? 'contentType' : 'component';

  const handleClickAddComponentToDZ = dynamicZoneTarget => {
    onOpenModalAddComponentsToDZ({ dynamicZoneTarget, targetUid });
  };

  const handleClickEditField = async (forTarget, targetUid, attributeName, type) => {
    const attributeType = getAttributeDisplayedType(type);
    const step = type === 'component' ? '2' : null;

    onOpenModalEditField({
      forTarget,
      targetUid,
      attributeName,
      attributeType,
      step,
    });
  };

  const getDescription = () => {
    const description = get(modifiedData, [firstMainDataPath, 'schema', 'description'], null);

    return (
      description ||
      formatMessage({
        id: getTrad('modelPage.contentHeader.emptyDescription.description'),
      })
    );
  };

  let label = get(modifiedData, [firstMainDataPath, 'schema', 'name'], '');
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
    });
  };

  return (
    <>
      <Prompt
        message={formatMessage({ id: getTrad('prompt.unsaved') })}
        // when={hasModelBeenModified && enablePrompt}
        when={false}
      />
      <HeaderLayout
        id="title"
        primaryAction={
          isInDevelopmentMode && (
            <Stack horizontal size={2}>
              {/* DON'T display the add field button when the content type has not been created */}
              {!isCreatingFirstContentType && (
                <Button
                  startIcon={<AddIcon />}
                  variant="secondary"
                  onClick={() => {
                    onOpenModalAddField({ forTarget, targetUid });
                  }}
                >
                  {formatMessage({ id: getTrad('button.attributes.add.another') })}
                </Button>
              )}
              <Button
                startIcon={<CheckIcon />}
                onClick={() => submitData()}
                type="submit"
                disabled={isEqual(modifiedData, initialData)}
              >
                {formatMessage({
                  id: getTrad('form.button.save'),
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
            <Button startIcon={<EditIcon />} variant="tertiary" onClick={onEdit}>
              {formatMessage({
                id: getTrad('app.utils.edit'),
                defaultMessage: 'Edit',
              })}
            </Button>
          )
        }
        title={upperFirst(label)}
        subtitle={getDescription()}
        navigationAction={
          <Link startIcon={<BackIcon />} to="/plugins/content-type-builder/">
            {formatMessage({
              id: 'app.components.go-back',
              defaultMessage: 'Go back',
            })}
          </Link>
        }
      />
      <ContentLayout>
        <Stack size={4}>
          <Row justifyContent="flex-end">
            <Stack horizontal size={2}>
              <LinkToCMSettingsView
                key="link-to-cm-settings-view"
                targetUid={targetUid}
                isTemporary={isTemporary}
                isInContentTypeView={isInContentTypeView}
                contentTypeKind={contentTypeKind}
              />
            </Stack>
          </Row>
          <Box background="neutral0" shadow="filterShadow" hasRadius>
            <List
              items={attributes}
              customRowComponent={props => <ListRow {...props} onClick={handleClickEditField} />}
              addComponentToDZ={handleClickAddComponentToDZ}
              targetUid={targetUid}
              dataType={forTarget}
              dataTypeName={currentDataName}
              mainTypeName={currentDataName}
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
