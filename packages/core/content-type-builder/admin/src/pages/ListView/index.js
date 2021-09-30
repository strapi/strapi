/**
 *  ! Have a discussion with maeva about l.170
 */

import React, { useEffect, useState } from 'react';
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
import { Prompt, useHistory, useLocation } from 'react-router-dom';
import List from '../../components/List';
import ListRow from '../../components/ListRow';
import ListViewContext from '../../contexts/ListViewContext';
import useDataManager from '../../hooks/useDataManager';
import getAttributeDisplayedType from '../../utils/getAttributeDisplayedType';
import getTrad from '../../utils/getTrad';
import makeSearch from '../../utils/makeSearch';
// import LinkToCMSettingsView from './LinkToCMSettingsView';

/* eslint-disable indent */

const ListView = () => {
  const {
    initialData,
    modifiedData,
    isInDevelopmentMode,
    isInContentTypeView,
    submitData,
    toggleModalCancel,
  } = useDataManager();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { push } = useHistory();
  const { search } = useLocation();
  const [enablePrompt, togglePrompt] = useState(true);

  useEffect(() => {
    if (search === '') {
      togglePrompt(true);
    }
  }, [search]);

  // Disabling the prompt on the first render if one of the modal is open
  useEffect(() => {
    if (search !== '') {
      togglePrompt(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstMainDataPath = isInContentTypeView ? 'contentType' : 'component';
  const mainDataTypeAttributesPath = [firstMainDataPath, 'schema', 'attributes'];
  const targetUid = get(modifiedData, [firstMainDataPath, 'uid']);
  // const isTemporary = get(modifiedData, [firstMainDataPath, 'isTemporary'], false);
  const contentTypeKind = get(modifiedData, [firstMainDataPath, 'schema', 'kind'], null);

  const attributes = get(modifiedData, mainDataTypeAttributesPath, []);
  // const attributesLength = attributes.length;
  const currentDataName = get(initialData, [firstMainDataPath, 'schema', 'name'], '');
  const isFromPlugin = has(initialData, [firstMainDataPath, 'plugin']);
  const hasModelBeenModified = !isEqual(modifiedData, initialData);
  const forTarget = isInContentTypeView ? 'contentType' : 'component';

  const handleClickAddField = async (
    forTarget,
    targetUid,
    firstHeaderObj,
    secondHeaderObj,
    thirdHeaderObj,
    fourthHeaderObj
  ) => {
    // disable the prompt
    await wait();

    const searchObj = {
      modalType: 'chooseAttribute',
      forTarget,
      targetUid,
      ...firstHeaderObj,
      ...secondHeaderObj,
      ...thirdHeaderObj,
      ...fourthHeaderObj,
    };

    push({ search: makeSearch(searchObj) });
  };

  const handleClickAddComponentToDZ = async dzName => {
    const firstHeaderObject = {
      header_label_1: currentDataName,
      header_icon_name_1: 'dynamiczone',
      header_icon_isCustom_1: false,
    };
    const secondHeaderObj = {
      header_label_2: dzName,
    };
    const search = {
      modalType: 'addComponentToDynamicZone',
      forTarget: 'contentType',
      targetUid,
      dynamicZoneTarget: dzName,
      settingType: 'base',
      step: '1',
      actionType: 'edit',
      ...firstHeaderObject,
      ...secondHeaderObj,
    };

    await wait();

    push({ search: makeSearch(search, true) });
  };

  const handleClickEditField = async (
    forTarget,
    targetUid,
    attributeName,
    type,
    firstHeaderObj,
    secondHeaderObj,
    thirdHeaderObj,
    fourthHeaderObj,
    fifthHeaderObj
  ) => {
    const attributeType = getAttributeDisplayedType(type);

    await wait();

    const search = {
      modalType: 'attribute',
      actionType: 'edit',
      settingType: 'base',
      forTarget,
      targetUid,
      attributeName,
      attributeType,
      step: type === 'component' ? '2' : null,
      ...firstHeaderObj,
      ...secondHeaderObj,
      ...thirdHeaderObj,
      ...fourthHeaderObj,
      ...fifthHeaderObj,
    };

    await wait();

    push({ search: makeSearch(search, true) });
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

  const wait = async () => {
    togglePrompt(false);

    return new Promise(resolve => setTimeout(resolve, 100));
  };
  const label = get(modifiedData, [firstMainDataPath, 'schema', 'name'], '');
  const kind = get(modifiedData, [firstMainDataPath, 'schema', 'kind'], '');

  // const listTitle = [
  //   formatMessage(
  //     {
  //       id: `${pluginId}.table.attributes.title.${attributesLength > 1 ? 'plural' : 'singular'}`,
  //     },
  //     { number: attributesLength }
  //   ),
  // ];

  const onEdit = async () => {
    await wait();

    const contentType = kind || firstMainDataPath;

    if (contentType === 'collectionType') {
      trackUsage('willEditNameOfContentType');
    }
    if (contentType === 'singleType') {
      trackUsage('willEditNameOfSingleType');
    }

    push({
      search: makeSearch({
        modalType: firstMainDataPath,
        actionType: 'edit',
        settingType: 'base',
        forTarget: firstMainDataPath,
        targetUid,
        header_label_1: label,
        header_icon_isCustom_1: false,
        header_icon_name_1: contentType === 'singleType' ? contentType : firstMainDataPath,
        headerId: getTrad('modalForm.header-edit'),
      }),
    });
  };

  return (
    <ListViewContext.Provider value={{ openModalAddField: handleClickAddField }}>
      <>
        <Prompt
          message={formatMessage({ id: getTrad('prompt.unsaved') })}
          when={hasModelBeenModified && enablePrompt}
        />
        <HeaderLayout
          id="title"
          primaryAction={
            isInDevelopmentMode && (
              <Stack horizontal size={2}>
                <Button
                  variant="secondary"
                  onClick={toggleModalCancel}
                  disabled={isEqual(modifiedData, initialData)}
                >
                  {formatMessage({
                    id: getTrad('form.button.cancel'),
                    defaultMessage: 'Cancel',
                  })}
                </Button>
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
            !isFromPlugin && (
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
                {/* <LinkToCMSettingsView
                  key="link-to-cm-settings-view"
                  targetUid={targetUid}
                  isTemporary={isTemporary}
                  isInContentTypeView={isInContentTypeView}
                  contentTypeKind={contentTypeKind}
                /> */}
                <Button
                  startIcon={<AddIcon />}
                  variant="primary"
                  onClick={() => {
                    const headerDisplayObject = {
                      header_label_1: currentDataName,
                      header_icon_name_1: forTarget === 'contentType' ? contentTypeKind : forTarget,
                      header_icon_isCustom_1: false,
                    };
                    handleClickAddField(forTarget, targetUid, headerDisplayObject);
                  }}
                >
                  {formatMessage({ id: getTrad('button.attributes.add.another') })}
                </Button>
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
    </ListViewContext.Provider>
  );
};

export default ListView;
