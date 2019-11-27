import React from 'react';
import Select from 'react-select';
import PropTypes from 'prop-types';
import { SelectWrapper, SelectNav } from 'strapi-helper-plugin';
import { ErrorMessage } from '@buffetjs/styles';
import useDataManager from '../../hooks/useDataManager';

const ComponentSelect = ({ error, label, onChange, name }) => {
  const { componentsGroupedByCategory, components } = useDataManager();
  console.log({ componentsGroupedByCategory });
  const styles = {
    container: base => ({
      ...base,
      'z-index': 9999,
      // padding: 0,
    }),
    control: (base, state) => ({
      ...base,
      'z-index': 9999,
      border: state.isFocused
        ? '1px solid #78caff !important'
        : error
        ? '1px solid red !important'
        : '1px solid #E3E9F3 !important',
    }),
    menu: base => {
      return {
        ...base,

        border: '1px solid #78caff !important',
        borderColor: '#78caff !important',
        borderTopColor: '#E3E9F3 !important',
      };
    },
  };
  const Menu = props => {
    console.log({ props });

    return (
      <div style={{ border: '1px solid black' }}>
        <ul style={{ backgroundColor: '#fff', margin: '0 -10px' }}>
          {Object.keys(componentsGroupedByCategory).map(categoryName => {
            return (
              <li key={categoryName}>
                {categoryName}
                <ul>
                  {componentsGroupedByCategory[categoryName].map(component => {
                    return <li key={component.uid}>{component.schema.name}</li>;
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
        {/* <ul>
          <li>
            Default
            <ul>
              <li>Closing period</li>
            </ul>
          </li>
        </ul> */}
      </div>
    );
  };
  const formattedOptions = Object.keys(componentsGroupedByCategory).reduce(
    (acc, current) => {
      const optionValueObject = componentsGroupedByCategory[current];
      const option = {
        label: current,
        value: optionValueObject.map(val => val.uid),
        // value:
        options: optionValueObject.map(val => ({
          label: val.schema.name,
          value: val.uid,
        })),
      };

      acc.push(option);
      return acc;
    },
    []
  );
  const formattedOptions2 = Object.keys(components).reduce((acc, current) => {
    const option = {
      label: `${current} - ${components[current].schema.name}`,
      value: current,
    };

    acc.push(option);

    return acc;
  }, []);

  console.log(formattedOptions);
  return (
    <SelectWrapper className="form-group" style={{ marginBottom: 0 }}>
      <SelectNav>
        <div>
          <label htmlFor={name}>{label}</label>
        </div>
      </SelectNav>
      <Select
        isClearable
        // onChange={handleChange}
        styles={styles}
        // value={{ label: 'coucou', value: 'coucou' }}
        // value="coucou"
        options={formattedOptions2}
        // options={[
        //   {
        //     label: 'coucou',
        //     value: 'coucou',
        //     options: [{ label: 'un', value: 'deux' }],
        //   },
        // ]}
        // options={componentsGroupedByCategory}
        components={{ Menu }}
        menuIsOpen
        // options={formatOptions()}
        // menuIsOpen
      />

      {error && <ErrorMessage style={{ paddingTop: 9 }}>{error}</ErrorMessage>}
    </SelectWrapper>
  );
};

ComponentSelect.defaultProps = {
  error: null,
};

ComponentSelect.propTypes = {
  error: PropTypes.string,
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default ComponentSelect;
