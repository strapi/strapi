/**
 *
 * DynamicZoneList
 *
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import ComponentList from '../ComponentList';

import { TabContent, TabPane, Nav, NavLink } from 'reactstrap';

function DynamicZoneList({ customRowComponent, components }) {
  const [activeTab, setActiveTab] = useState('0');
  const toggle = tab => {
    if (activeTab !== tab) setActiveTab(tab);
  };

  return (
    <tr className="dynamiczone-row">
      <td colSpan={12}>
        <div>
          <Nav tabs>
            {components.map((component, index) => {
              return (
                <NavLink
                  key={component}
                  className={activeTab === `${index}` ? 'active' : ''}
                  onClick={() => {
                    toggle(`${index}`);
                  }}
                >
                  {component}
                </NavLink>
              );
            })}
          </Nav>
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
                      <ComponentList {...props} key={component} />
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
  components: [],
  customRowComponent: null,
};

DynamicZoneList.propTypes = {
  components: PropTypes.instanceOf(Array),
  customRowComponent: PropTypes.func,
};

export default DynamicZoneList;
