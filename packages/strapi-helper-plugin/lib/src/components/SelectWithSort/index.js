import React from 'react';
import PropTypes from 'prop-types';
import Dropdown from 'components/Dropdown';
import SortList from 'components/SortList';
import request from 'utils/request';

const style = {
  marginTop: '0.9rem',
};

class SelectWithSort extends React.Component {
  
  state = {
    loading: true,
    options: [],
  }

  componentDidMount() {
    this.getOptions();
  }

  onSelectChange = (id) => {
    const { value, onChange } = this.props;

    onChange([...value, id]);
  }

  onSortChange = (items) => {
    const newValue = items.map(i => i.id);

    this.props.onChange(newValue);
  }

  onRemove = (item) => {
    const { value, onChange } = this.props;
    onChange(value.filter(id => id !== item.id));
  }

  getOptions = () => {
    const requestUrl = '/content-manager/explorer/refs';
    
    request(requestUrl, {
      method: 'GET',
    })
      .then(options => {
        this.setState({
          options: options,
          loading: false,
        });
      })
      .catch(() => {
        strapi.notification.error('content-manager.notification.error.relationship.fetch');
        this.setState({
          loading: false,
        });
      });
  }

  render() {
    const { value } = this.props;
    const { options, loading } = this.state;
    const selectOptions = options.filter(op => !value.includes(op.id));
    const items = value.map(id => options.find(op => op.id === id)).filter(Boolean);

    if(loading) return 'Loading...';

    return (
      <React.Fragment>
        <div style={style}>
          <Dropdown options={selectOptions} selected={items} onChange={this.onSelectChange} />
        </div>
        <div style={style}>
          <SortList items={items} onRemove={this.onRemove} onChange={this.onSortChange} />
        </div>
      </React.Fragment>
    );
  }
}

SelectWithSort.defaultProps = {
  value: undefined,
};

SelectWithSort.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.string]),
};


export default SelectWithSort;