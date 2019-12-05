import React, { useEffect, useState } from 'react';
import { Prompt, useHistory, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { get, isEqual } from 'lodash';
import {
  BackHeader,
  ListWrapper,
  useGlobalContext,
  ViewContainer,
} from 'strapi-helper-plugin';
import { Header } from '@buffetjs/custom';
import convertAttrObjToArray from '../../utils/convertAttrObjToArray';
import getTrad from '../../utils/getTrad';
import makeSearch from '../../utils/makeSearch';
import ListRow from '../../components/ListRow';
import List from '../../components/List';

import useDataManager from '../../hooks/useDataManager';
import pluginId from '../../pluginId';

import ListHeader from '../../components/ListHeader';
import LeftMenu from '../LeftMenu';

const ListPage = () => {
  const {
    initialData,
    modifiedData,
    isInDevelopmentMode,
    isInContentTypeView,
    submitData,
    toggleModalCancel,
  } = useDataManager();

  const { formatMessage } = useGlobalContext();
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
  const mainDataTypeAttributesPath = [
    firstMainDataPath,
    'schema',
    'attributes',
  ];
  const targetUid = get(modifiedData, [firstMainDataPath, 'uid']);

  const attributes = get(modifiedData, mainDataTypeAttributesPath, {});
  const attributesLength = Object.keys(attributes).length;
  const currentDataName = get(
    initialData,
    [firstMainDataPath, 'schema', 'name'],
    ''
  );
  const hasModelBeenModified = !isEqual(modifiedData, initialData);
  const forTarget = isInContentTypeView ? 'contentType' : 'component';

  const handleClickAddAttributeMainData = async () => {
    const searchObj = {
      modalType: 'chooseAttribute',
      forTarget,
      targetUid,
      headerDisplayName: currentDataName,
    };

    // Disable the prompt
    await wait();
    // const search = `modalType=chooseAttribute&forTarget=${forTarget}&targetUid=${targetUid}&headerDisplayName=${currentDataName}`;
    push({ search: makeSearch(searchObj, true) });
  };

  const handleClickAddComponentToDZ = dzName => {
    const search = `modalType=addComponentToDynamicZone&forTarget=contentType&targetUid=${targetUid}&headerDisplayCategory=${currentDataName}&dynamicZoneTarget=${dzName}&settingType=base&step=1&actionType=create&headerDisplayName=${dzName}`;
    push({ search });
  };

  const handleClickEditField = async (
    forTarget,
    targetUid,
    attributeName,
    type,
    headerDisplayName,
    headerDisplayCategory = null,
    headerDisplaySubCategory = null,
    subTargetUid = null
    // TODO ADD LOGIC headerDisplaySubCategory when editing a field
    // It should be the same one as adding a field
  ) => {
    let attributeType;

    console.log({
      headerDisplayName,
      headerDisplayCategory,
      headerDisplaySubCategory,
      subTargetUid,
    });

    switch (type) {
      case 'integer':
      case 'biginteger':
      case 'decimal':
      case 'float':
        attributeType = 'number';
        break;
      case 'string':
      case 'text':
        attributeType = 'text';
        break;
      case '':
        attributeType = 'relation';
        break;
      default:
        attributeType = type;
    }

    // const step = type === 'component' ? '&step=2' : '';
    // const displayCategory = headerDisplayCategory
    //   ? `&headerDisplayCategory=${headerDisplayCategory}`
    //   : '';

    await wait();

    const search = {
      modalType: 'attribute',
      actionType: 'edit',
      settingType: 'base',
      forTarget,
      targetUid,
      attributeName,
      attributeType,
      headerDisplayName,
      headerDisplayCategory,
      headerDisplaySubCategory,
      step: type === 'component' ? '2' : null,
      subTargetUid,
    };

    await wait();

    push({ search: makeSearch(search, true) });

    // push({
    //   search: `modalType=attribute&actionType=edit&settingType=base&forTarget=${forTarget}&targetUid=${targetUid}&attributeName=${attrName}&attributeType=${attributeType}&headerDisplayName=${headerDisplayName}${step}${displayCategory}`,
    // });
  };

  // const handleClickEditMain = () => {
  //   push({
  //     search: `modalType=${firstMainDataPath}&settingType=base&actionType=edit&forTarget=${forTarget}&targetUid=${targetUid}&headerDisplayName=${currentDataName}`,
  //   });
  //   emitEvent('willEditNameOfGroup');
  // };

  // const handleClickEditComponent = compoName => {
  //   const search = `modalType=attribute&actionType=edit&settingType=base&forTarget=${forTarget}&targetUid=${targetUid}&attributeName=${attrName}&attributeType=${attributeType}&headerDisplayName=${headerDisplayName}`,
  //   push({ search });
  // }

  const getDescription = () => {
    const description = get(
      modifiedData,
      [firstMainDataPath, 'schema', 'description'],
      null
    );

    return description
      ? description
      : formatMessage({
          id: `${pluginId}.modelPage.contentHeader.emptyDescription.description`,
        });
  };

  const wait = async () => {
    togglePrompt(false);
    return new Promise(resolve => setTimeout(resolve, 100));
  };
  const label = get(modifiedData, [firstMainDataPath, 'schema', 'name'], '');

  const headerProps = {
    actions: isInDevelopmentMode
      ? [
          {
            color: 'cancel',
            onClick: () => {
              toggleModalCancel();
            },
            title: formatMessage({
              id: `${pluginId}.form.button.cancel`,
            }),
            type: 'button',
            disabled: isEqual(modifiedData, initialData) ? true : false,
          },
          {
            color: 'success',
            onClick: () => submitData(),
            title: formatMessage({
              id: `${pluginId}.form.button.save`,
            }),
            type: 'submit',
            disabled: isEqual(modifiedData, initialData) ? true : false,
          },
        ]
      : [],
    title: {
      label,
      cta: isInDevelopmentMode
        ? {
            icon: 'pencil-alt',
            onClick: async () => {
              await wait();

              push({
                search: makeSearch({
                  modalType: firstMainDataPath,
                  actionType: 'edit',
                  settingType: 'base',
                  forTarget: firstMainDataPath,
                  targetUid,
                  headerDisplayName: label,
                }),
              });
            },
          }
        : null,
    },
    content: getDescription(),
  };

  const listTitle = [
    formatMessage(
      {
        id: `${pluginId}.table.attributes.title.${
          attributesLength > 1 ? 'plural' : 'singular'
        }`,
      },
      { number: attributesLength }
    ),
  ];

  const addButtonProps = {
    icon: true,
    color: 'primary',
    label: formatMessage({ id: `${pluginId}.button.attributes.add.another` }),
    onClick: handleClickAddAttributeMainData,
  };

  const listActions = isInDevelopmentMode ? [{ ...addButtonProps }] : [];

  const handleClickOnTrashIcon = () => {};

  const CustomRow = props => {
    const { name } = props;

    return (
      <ListRow
        {...props}
        attributeName={name}
        name={name}
        onClick={handleClickEditField}
        onClickDelete={handleClickOnTrashIcon}
      />
    );
  };

  CustomRow.defaultProps = {
    name: null,
  };

  CustomRow.propTypes = {
    name: PropTypes.string,
  };

  return (
    <ViewContainer>
      <BackHeader />
      <Prompt
        message={formatMessage({ id: getTrad('prompt.unsaved') })}
        when={hasModelBeenModified && enablePrompt}
      />
      <div className="container-fluid">
        <div className="row">
          <LeftMenu wait={wait} />
          <div
            className="col-md-9 content"
            style={{ paddingLeft: '30px', paddingRight: '30px' }}
          >
            <Header {...headerProps} />

            <ListWrapper>
              <ListHeader actions={listActions} title={listTitle} />
              <List
                items={convertAttrObjToArray(attributes)}
                customRowComponent={props => <CustomRow {...props} />}
                addField={handleClickAddAttributeMainData}
                addComponentToDZ={handleClickAddComponentToDZ}
                targetUid={targetUid}
                dataType={forTarget}
                dataTypeName={currentDataName}
                //
                mainTypeName={currentDataName}
                editTarget={forTarget}
                // parentTarget={forTarget}
              ></List>
            </ListWrapper>
          </div>
        </div>
      </div>
    </ViewContainer>
  );
};

export default ListPage;
