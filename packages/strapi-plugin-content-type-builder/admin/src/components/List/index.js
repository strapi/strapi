/**
 *
 * List
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import {
  TabContent,
  TabPane,
  Nav,
  NavItem,
  NavLink,
  Row,
  Col,
} from 'reactstrap';

import convertAttrObjToArray from '../../utils/convertAttrObjToArray';
import useDataManager from '../../hooks/useDataManager';

// TODO fix merge conflict
import Wrapper from './List';

/* eslint-disable */
function List({ className, customRowComponent, items }) {
  const { modifiedData } = useDataManager();

  const getComponentSchema = componentName => {
    return get(modifiedData, ['components', componentName], {
      schema: { attributes: {} },
    });
  };

  const renderComponentList = ({ component }) => {
    const {
      schema: { attributes },
    } = getComponentSchema(component);

    return (
      <tr className="component-row">
        <td colSpan={12}>
          {List({
            customRowComponent,
            items: convertAttrObjToArray(attributes),
          })}
        </td>
      </tr>
    );
  };

  renderComponentList.defaultProps = {
    component: null,
  };

  renderComponentList.propTypes = {
    component: PropTypes.string,
  };

  const renderDynamicZoneList = ({ components }) => {
    const activeTab = '1';
    // const [activeTab, setActiveTab] = useState('1');

    // const toggle = tab => {
    //   if (activeTab !== tab) setActiveTab(tab);
    // };

    return (
      <tr className="dynamiczone-row">
        <td colSpan={12}>
          <Nav tabs>
            <NavItem>
              <NavLink
                className={activeTab === '1' && 'active'}
                onClick={() => {
                  // toggle('1');
                }}
              >
                Tab1
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={activeTab === '2' && 'active'}
                onClick={() => {
                  // toggle('2');
                }}
              >
                Moar Tabs
              </NavLink>
            </NavItem>
          </Nav>
          <TabContent activeTab={activeTab}>
            <TabPane tabId="1">
              <Row>
                <Col sm="12">
                  <h4>Tab 1 Contents</h4>
                </Col>
              </Row>
            </TabPane>
            <TabPane tabId="2">
              <h4>Tab 2 Contents</h4>
            </TabPane>
          </TabContent>

          {components.map(component => {
            return renderComponentList({ component });
          })}
        </td>
      </tr>
    );
  };

  renderDynamicZoneList.defaultProps = {
    components: [],
  };

  renderDynamicZoneList.propTypes = {
    components: PropTypes.instanceOf(Array),
  };

  return (
    <Wrapper className={className}>
      <table>
        <tbody>
          {items.map(item => {
            const { type } = item;
            return (
              <React.Fragment key={JSON.stringify(item)}>
                {customRowComponent(item)}

                {type === 'component' &&
                  renderComponentList({
                    ...item,
                  })}

                {type === 'dynamiczone' &&
                  renderDynamicZoneList({
                    ...item,
                  })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </Wrapper>
  );
}

List.defaultProps = {
  className: null,
  customRowComponent: null,
  items: [],
  isSub: false,
};

List.propTypes = {
  className: PropTypes.string,
  customRowComponent: PropTypes.func,
  items: PropTypes.instanceOf(Array),
  isSub: PropTypes.bool,
};

export default List;
