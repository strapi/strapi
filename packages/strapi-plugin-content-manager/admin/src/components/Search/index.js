/*
*
* Search
*
*/

import React from 'react';

import styles from './styles.scss';

class Search extends React.Component {
  state = { value: '' };

  handleChange = ({ target }) => {
    this.setState({ value: target.value });
  }

  render() {
    return (
      <div className={styles.search}>
        <input type="text" onChange={this.handleChange} value={this.state.value} />
      </div>
    );
  }
}

export default Search;
