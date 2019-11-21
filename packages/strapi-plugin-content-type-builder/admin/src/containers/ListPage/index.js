import React from 'react';
import { useHistory } from 'react-router-dom';
import { get, has } from 'lodash';
import { ViewContainer } from 'strapi-helper-plugin';
import useDataManager from '../../hooks/useDataManager';
import LeftMenu from '../LeftMenu';

const ListPage = () => {
  const {
    // components,
    initialData,
    modifiedData,
    isInContentTypeView,
  } = useDataManager();
  const { push } = useHistory();
  const firstMainDataPath = isInContentTypeView ? 'contentType' : 'component';
  const mainDataTypeAttributesPath = [
    firstMainDataPath,
    'schema',
    'attributes',
  ];

  const attributes = get(modifiedData, mainDataTypeAttributesPath, {});
  const currentDataName = get(
    initialData,
    [firstMainDataPath, 'schema', 'name'],
    ''
  );
  const targetUid = get(modifiedData, [firstMainDataPath, 'uid']);

  const handleClickAddAttributeMainData = () => {
    const forTarget = isInContentTypeView ? 'contentType' : 'component';
    const search = `modalType=chooseAttribute&forTarget=${forTarget}&targetUid=${targetUid}&headerDisplayName=${currentDataName}`;
    push({ search });
  };
  const handleClickAddAttributeNestedData = (targetUid, headerDisplayName) => {
    const search = `modalType=chooseAttribute&forTarget=components&targetUid=${targetUid}&headerDisplayName=${headerDisplayName}`;
    push({ search });
  };
  // TODO just a util not sure it should be kept
  const getType = attrName => {
    const type = has(modifiedData, [
      ...mainDataTypeAttributesPath,
      attrName,
      'nature',
    ])
      ? 'relation'
      : get(
          modifiedData,
          [...mainDataTypeAttributesPath, attrName, 'type'],
          ''
        );

    return type;
  };

  const getComponent = attrName => {
    const componentToGet = get(
      modifiedData,
      [...mainDataTypeAttributesPath, attrName, 'component'],
      ''
    );
    const componentSchema = get(
      modifiedData,
      ['components', componentToGet],
      {}
    );

    return componentSchema;
  };
  const handleClickEditField = (
    forTarget,
    targetUid,
    attrName,
    type,
    headerDisplayName
  ) => {
    let attributeType;

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
      default:
        attributeType = type;
    }

    push({
      search: `modalType=attribute&actionType=edit&settingType=base&forTarget=${forTarget}&targetUid=${targetUid}&attributeName=${attrName}&attributeType=${attributeType}&headerDisplayName=${headerDisplayName}`,
    });
  };

  return (
    <ViewContainer>
      <div className="container-fluid">
        <div className="row">
          <LeftMenu />
          <div className="col-md-9">
            <button type="button" onClick={handleClickAddAttributeMainData}>
              Add field
            </button>

            {/* REALLY TEMPORARY SINCE IT DOESN T SUPPORT ANY NESTING COMPONENT*/}
            <ul>
              {Object.keys(attributes).map(attr => {
                const type = getType(attr);

                if (type === 'component') {
                  const compoData = getComponent(attr);
                  const componentSchema = get(
                    compoData,
                    ['schema', 'attributes'],
                    {}
                  );
                  // TODO edit component field name & other stuff
                  // TODO edit component's fields
                  return (
                    <li key={attr}>
                      <span>{attr}</span>
                      &nbsp:
                      <span>component</span>
                      <ul>
                        {Object.keys(componentSchema).map(componentAttr => {
                          const componentAttrType = get(
                            componentSchema,
                            [componentAttr, 'type'],
                            ''
                          );

                          return (
                            <li key={`${attr}.${componentAttr}`}>
                              <span>{componentAttr}</span>
                              &nbsp;
                              <span>{componentAttrType}</span>
                            </li>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() =>
                            handleClickAddAttributeNestedData(
                              get(compoData, 'uid', ''),
                              get(compoData, 'schema.name', 'ERROR')
                            )
                          }
                        >
                          Add field
                        </button>
                      </ul>
                    </li>
                  );
                }

                return (
                  <li
                    key={attr}
                    onClick={() =>
                      handleClickEditField(
                        'contentType',
                        targetUid,
                        attr,
                        type,
                        currentDataName
                      )
                    }
                  >
                    <span>{attr}</span>
                    &nbsp;
                    <span>{type}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </ViewContainer>
  );
};

export default ListPage;
