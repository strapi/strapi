/**
 *
 * DynamicZoneList
 *
 */

/* eslint-disable import/no-cycle */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { TabContent, TabPane, Nav } from 'reactstrap';
import { Plus } from '@buffetjs/icons';
import useDataManager from '../../hooks/useDataManager';
import getTrad from '../../utils/getTrad';
import ComponentList from '../ComponentList';
import ComponentCard from '../ComponentCard';
import Td from '../Td';
import ComponentButton from './ComponentButton';

function DynamicZoneList({
  customRowComponent,
  components,
  addComponent,
  mainTypeName,
  name,
  targetUid,
}) {
  const { isInDevelopmentMode } = useDataManager();
  const [activeTab, setActiveTab] = useState('0');

  const toggle = tab => {
    if (activeTab !== tab) {
      setActiveTab(tab);
    }
  };

  const handleClickAdd = () => {
    addComponent(name);
  };

  return (
    <tr className="dynamiczone-row">
      <Td colSpan={12} isFromDynamicZone>
        <div>
          <div className="tabs-wrapper">
            <Nav tabs>
              {isInDevelopmentMode && (
                <li>
                  <ComponentButton onClick={handleClickAdd}>
                    <div>
                      <Plus style={{ height: 15, width: 15 }} />
                    </div>
                    <p>
                      <FormattedMessage id={getTrad('button.component.add')} />
                    </p>
                  </ComponentButton>
                </li>
              )}
              {components.map((component, index) => {
                return (
                  <li key={component}>
                    <ComponentCard
                      dzName={name}
                      index={index}
                      component={component}
                      isActive={activeTab === `${index}`}
                      isInDevelopmentMode={isInDevelopmentMode}
                      onClick={() => {
                        toggle(`${index}`);
                      }}
                    />
                  </li>
                );
              })}
            </Nav>
          </div>
          <TabContent activeTab={activeTab}>
            {components.map((component, index) => {
              const props = {
                customRowComponent,
                component,
              };

              return (
                <TabPane tabId={`${index}`} key={component}>
                  <table>
                    <tbody>
                      <ComponentList
                        {...props}
                        isFromDynamicZone
                        dzName={name}
                        mainTypeName={mainTypeName}
                        targetUid={targetUid}
                        key={component}
                      />
                    </tbody>
                  </table>
                </TabPane>
              );
            })}
          </TabContent>
        </div>
      </Td>
    </tr>
  );
}

DynamicZoneList.defaultProps = {
  addComponent: () => {},
  components: [],
  customRowComponent: null,
  name: null,
};

DynamicZoneList.propTypes = {
  addComponent: PropTypes.func,
  components: PropTypes.instanceOf(Array),
  customRowComponent: PropTypes.func,
  mainTypeName: PropTypes.string.isRequired,
  name: PropTypes.string,
  targetUid: PropTypes.string.isRequired,
};

export default DynamicZoneList;
