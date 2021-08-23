import React, { createContext, useContext, useState } from 'react';
import PropTypes from 'prop-types';
import { TabNavRaw, TabButton, TabsRaw, TabPanelRaw } from './TabComponents';

const TabsIndexContext = createContext({ selectedIndex: 0, setSelectedIndex: () => undefined });
const TabsIdContext = createContext(null);

export const TabsNav = ({ children, defaultSelection, label, id }) => {
  const [selectedIndex, setSelectedIndex] = useState(defaultSelection);

  return (
    <TabsIdContext.Provider value={id}>
      <TabsIndexContext.Provider value={{ selectedIndex, setSelectedIndex }}>
        <TabNavRaw role="tablist" aria-label={label}>
          {children}
        </TabNavRaw>
      </TabsIndexContext.Provider>
    </TabsIdContext.Provider>
  );
};

TabsNav.propTypes = {
  id: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  defaultSelection: PropTypes.number.isRequired,
};

export const Tabs = ({ children, position }) => {
  const id = useContext(TabsIdContext);
  const { setSelectedIndex, selectedIndex } = useContext(TabsIndexContext);
  const childrenArray = React.Children.toArray(children);

  return (
    <TabsRaw position={position}>
      {childrenArray.map((child, index) =>
        React.cloneElement(child, {
          onSelect: () => setSelectedIndex(index),
          selected: index === selectedIndex,
          id: `${id}-${index}`,
        })
      )}
    </TabsRaw>
  );
};

Tabs.defaultProps = {
  position: 'left',
};

Tabs.propTypes = {
  children: PropTypes.node.isRequired,
  position: PropTypes.oneOf(['left', 'right']),
};

export const TabsPanel = ({ children }) => {
  const { selectedIndex } = useContext(TabsIndexContext);
  const id = useContext(TabsIdContext);
  const childrenArray = React.Children.toArray(children);

  return (
    <>
      {childrenArray.map((child, index) =>
        React.cloneElement(child, { selected: index === selectedIndex, id: `${id}-${index}` })
      )}
    </>
  );
};

TabsPanel.propTypes = {
  children: PropTypes.node.isRequired,
};

export const Tab = ({ children, selected, onSelect, id }) => {
  const ariaControls = `${id}-tabpanel`;

  return (
    <TabButton
      role="tab"
      id={`${id}-tab`}
      aria-selected={selected}
      aria-controls={ariaControls}
      tabIndex={-1}
      onClick={onSelect}
      type="button"
    >
      {children}
    </TabButton>
  );
};

Tab.defaultProps = {
  selected: false,
  id: '',
  onSelect: () => undefined,
};

Tab.propTypes = {
  children: PropTypes.node.isRequired,
  selected: PropTypes.bool,
  onSelect: PropTypes.func,
  id: PropTypes.string,
};

export const TabPanel = ({ children, selected, id }) => {
  const labelledBy = `${id}-tab`;

  return (
    <TabPanelRaw
      role="tabpanel"
      aria-labelledby={labelledBy}
      hidden={!selected}
      id={`${id}-tabpanel`}
    >
      {children}
    </TabPanelRaw>
  );
};

TabPanel.defaultProps = {
  id: '',
  selected: false,
};

TabPanel.propTypes = {
  children: PropTypes.node.isRequired,
  selected: PropTypes.bool,
  id: PropTypes.string,
};
