/**
 *
 * DynamicZoneList
 *
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { TabContent, TabPane, Nav } from 'reactstrap';
import { Plus } from '@buffetjs/icons';

import getTrad from '../../utils/getTrad';
import ComponentList from '../ComponentList';
import ComponentButton from './ComponentButton';
import ComponentCard from '../ComponentCard';

function DynamicZoneList({
  customRowComponent,
  components,
  addComponent,
  mainTypeName,
  name,
  targetUid,
}) {
  const [activeTab, setActiveTab] = useState('0');

  const toggle = tab => {
    if (activeTab !== tab) setActiveTab(tab);
  };

  const handleClickAdd = () => {
    addComponent(name);
  };

  return (
    <tr className="dynamiczone-row">
      <td colSpan={12}>
        <div>
          <div className="tabs-wrapper">
            <Nav tabs>
              <li>
                <ComponentButton onClick={handleClickAdd}>
                  <div>
                    <Plus />
                  </div>
                  <p>
                    <FormattedMessage id={getTrad('button.component.add')} />
                  </p>
                </ComponentButton>
              </li>
              {components.map((component, index) => {
                return (
                  <li key={component}>
                    <ComponentCard
                      dzName={name}
                      index={index}
                      component={component}
                      isActive={activeTab === `${index}`}
                      onClick={() => {
                        toggle(`${index}`);
                      }}
                    ></ComponentCard>
                  </li>
                );
              })}
            </Nav>
          </div>
          <TabContent activeTab={activeTab}>
            {components.map((component, index) => {
              const props = {
                customRowComponent: customRowComponent,
                component: component,
              };

              return (
                <TabPane tabId={`${index}`} key={component}>
                  <table>
                    <tbody>
                      <ComponentList
                        {...props}
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
      </td>
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
