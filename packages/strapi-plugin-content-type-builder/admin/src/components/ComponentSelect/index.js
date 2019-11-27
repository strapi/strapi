import React from 'react';
import Select from 'react-select';
import PropTypes from 'prop-types';
import useDataManager from '../../hooks/useDataManager';

// const SingleValue = ({ children, ...props }) => {
//   console.log({ propss: props });
//   return <div {...props}>{children}</div>;
// };

const ComponentSelect = ({ onChange, name, value, styles }) => {
  const { componentsGroupedByCategory } = useDataManager();

  const handleChange = (inputValue, actionMeta) => {
    const { action } = actionMeta;

    if (action === 'clear') {
      onChange({ target: { name, value: '' } });
    }
  };

  const Menu = props => {
    console.log({ props });

    return (
      <div style={{ bordere: '1px solid black' }}>
        <ul
          style={{
            backgroundColor: '#fff',
            // margin: '0 -10px',
            maxHeight: 150,
            overflow: 'auto',
          }}
        >
          {Object.keys(componentsGroupedByCategory).map(categoryName => {
            return (
              <li key={categoryName}>
                {categoryName}
                <ul>
                  {componentsGroupedByCategory[categoryName].map(component => {
                    return (
                      <li
                        key={component.uid}
                        onClick={e => {
                          e.stopPropagation();
                          console.log('click');
                          onChange({ target: { name, value: component.uid } });
                        }}
                      >
                        {component.schema.name}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <Select
      isClearable
      onChange={handleChange}
      styles={styles}
      value={{ label: value, value }}
      options={[]}
      components={{ MenuList: Menu }}
    />
  );
};

ComponentSelect.defaultProps = {
  error: null,
  value: null,
};

ComponentSelect.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  styles: PropTypes.object.isRequired,
  value: PropTypes.string,
};

export default ComponentSelect;
