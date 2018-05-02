import React from 'react';
import Select from 'react-select';
import PropTypes from 'prop-types';

class Dropdown extends React.Component {

  getOptions() {
    const { options = [] } = this.props;
    
    return options.map(o => ({
      value: o.id,
      label: `${o.title} - ${o.type}`,
      type: o.type,
    }));
  }

  render() {
    const { onChange } = this.props;
    const options = this.getOptions();

    return (
      <Select
        onChange={selected => onChange(selected.value)}
        options={options}
      />
    );
  }
}

const option = PropTypes.shape({
  type: PropTypes.string.isRequired,
  id: PropTypes.string,
  title: PropTypes.string,
});

Dropdown.propTypes = {
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(option).isRequired,
};

export default Dropdown;
