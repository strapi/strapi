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
import moment from 'moment';

import FileIcon from 'components/FileIcon';
import IcoContainer from 'components/IcoContainer';
import PopUpWarning from 'components/PopUpWarning';

import styles from './styles.scss';

/* eslint-disable react/no-string-refs */
class Li extends React.Component {
  state = { isOpen: false, copied: false };

  componentDidUpdate(prevProps, prevState) {
    if (prevState.copied !== this.state.copied && this.state.copied) {
      setTimeout(() => {
        this.setState({ copied: false });
      }, 3000);
    }
  }

  getUnit = (value) => {
    let unit;
    let divider;
    
    switch (true) {
      case value > 10000:
        unit = 'GB';
        divider = 1000;
        break;
      case value < 1:
        unit = 'B';
        divider = 1;
        break;
      case value > 1000:
        unit = 'MB';
        divider = 1000;
        break;
      default:
        unit = 'KB';
        divider = 1;
    }

    return { divider, unit };
  }

  handleClick = (e) => {
    e.preventDefault();
    const aTag = document.getElementById('aTag');
    aTag.click();
  }

  handleDelete = (e) => {
    e.preventDefault();
    this.context.deleteData(this.props.item);
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

  render() {
    const { item } = this.props;

    if (this.state.copied) {
      return this.renderLiCopied();
    }

    const icons = [
      // {
      //   icoType: item.private ? 'lock' : 'unlock',
      //   onClick: () => {},
      // },
      {
        icoType: 'eye',
        onClick: this.handleClick,
      },
      {
        icoType: 'trash',
        onClick: () => this.setState({ isOpen: true }),
      },
    ];

    return (
      <CopyToClipboard text={item.url} onCopy={() => this.setState({copied: true})}>
        <li className={styles.liWrapper}>
          <a href={item.url} target="_blank" style={{ display: 'none' }} id="aTag">nothing</a>
          <div className={styles.liContainer}>
            <div>
              <div />
              <FileIcon fileType={item.ext} />
            </div>
            {['hash', 'name', 'updatedAt', 'size', 'relatedTo', ''].map((value, key) => {
              if (value === 'updatedAt') {
                return (
                  <div key={key} className={styles.truncate}>{moment(item[value]).format('YYYY/MM/DD - HH:mm')}</div>
                );
              }

              if (value === 'size') {
                const { divider, unit } = this.getUnit(item[value]);
                const size = item[value]/divider;

                return (
                  <div key={key} className={styles.truncate}>{Math.round(size * 100) / 100 }&nbsp;{unit}</div>
                );
              }

              if (value !== '') {
                return (
                  <div key={key} className={styles.truncate}>{item[value]}</div>
                );
              }

              return <IcoContainer key={key} icons={icons} />;
            })}
          </div>
          <PopUpWarning
            isOpen={this.state.isOpen}
            onConfirm={this.handleDelete}
            toggleModal={() => this.setState({ isOpen: false })}
          />
        </li>
      </CopyToClipboard>
    );
  }
}

Li.contextTypes = {
  deleteData: PropTypes.func.isRequired,
};

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

Li.propTypes = {
  item: PropTypes.object,
};

export default Li;
