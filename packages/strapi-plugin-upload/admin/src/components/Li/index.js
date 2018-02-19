/**
 *
 * Li
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import cn from 'classnames';

import styles from './styles.scss';

class Li extends React.Component {
  state = { isOpen: false, copied: false };

  componentDidUpdate(prevProps, prevState) {
    if (prevState.copied !== this.state.copied && this.state.copied) {
      setTimeout(() => {
        this.setState({ copied: false });
      }, 3000);
    }
  }

  renderLiCopied = () => (
    <li className={cn(styles.liWrapper, styles.copied)}>
      <div>
        <div className={styles.checked}>
          <div />
        </div>
        <div>
          <FormattedMessage id="upload.Li.linkCopied" />
        </div>
      </div>
    </li>
  );

  toggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ isOpen: !this.state.isOpen });
  }

  render() {
    const { item } = this.props;

    if (this.state.copied) {
      return this.renderLiCopied();
    }

    return (
      <CopyToClipboard text={item.url} onCopy={() => this.setState({copied: true})}>
        <li className={styles.liWrapper}>
          <div className={styles.liContainer}>
            <div />
            {Object.keys(item).map((value, key) => {
              if (key === 0) {
                return (
                  <div key={key} className={styles.liIconContainer}>
                    <i className={`fa fa-file-${item[value]}-o`} />
                  </div>
                );
              }

              if (value !== 'url') {
                return (
                  <div key={key}>{item[value]}</div>
                );
              }
            })}
          </div>
        </li>
      </CopyToClipboard>
    );
  }
}

Li.defaultProps = {
  item: {
    type: 'pdf',
    hash: '1234',
    name: 'avatar.pdf',
    updated: '20/11/2017 19:29:54',
    size: '24 B',
    relatedTo: 'John Doe',
  },
};

Li.proptypes = {
  item: PropTypes.object,
};

export default Li;
