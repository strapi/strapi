/**
 *
 * Li
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import moment from 'moment';

import { IcoContainer, PopUpWarning } from 'strapi-helper-plugin';
import { HomePageContext } from '../../contexts/HomePage';
import FileIcon from '../FileIcon';
import { StyledLi, Truncate, Wrapper, Checked } from './components';

/* eslint-disable react/no-string-refs */
/* eslint-disable react/sort-comp */
/* eslint-disable react/no-array-index-key */
class Li extends React.Component {
  static contextType = HomePageContext;

  state = { isOpen: false, copied: false };

  componentDidUpdate(prevProps, prevState) {
    if (prevState.copied !== this.state.copied && this.state.copied) {
      setTimeout(() => {
        this.setState({ copied: false });
      }, 3000);
    }
  }

  getUnit = value => {
    let unit;
    let divider;

    switch (true) {
      case value > 1000000:
        unit = 'GB';
        divider = 1000000;
        break;
      case value < 1:
        unit = 'B';
        divider = 0.001;
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
  };

  handleClick = e => {
    e.preventDefault();
    const aTag = document.getElementById(this.props.item.hash);
    aTag.click();
  };

  handleDelete = e => {
    e.preventDefault();
    this.context.deleteData(this.props.item);
  };

  renderLiCopied = () => (
    <StyledLi withCopyStyle>
      <div>
        <Checked>
          <div />
        </Checked>
        <div>
          <FormattedMessage id="upload.Li.linkCopied" />
        </div>
      </div>
    </StyledLi>
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
      <CopyToClipboard
        text={item.url}
        onCopy={() => this.setState({ copied: true })}
      >
        <StyledLi>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'none' }}
            id={item.hash}
          >
            nothing
          </a>
          <Wrapper>
            <div>
              <div />
              <FileIcon fileType={item.ext} />
            </div>
            {['hash', 'name', 'updatedAt', 'size', 'relatedTo', ''].map(
              (value, key) => {
                if (value === 'updatedAt') {
                  return (
                    <Truncate key={key}>
                      {moment(item.updatedAt || item.updated_at).format(
                        'YYYY/MM/DD - HH:mm'
                      )}
                    </Truncate>
                  );
                }

                if (value === 'size') {
                  const { divider, unit } = this.getUnit(item[value]);
                  const size = item[value] / divider;

                  return (
                    <Truncate key={key}>
                      {Math.round(size * 100) / 100}&nbsp;{unit}
                    </Truncate>
                  );
                }

                if (value !== '') {
                  return <Truncate key={key}>{item[value]}</Truncate>;
                }

                return <IcoContainer key={key} icons={icons} />;
              }
            )}
          </Wrapper>
          <PopUpWarning
            isOpen={this.state.isOpen}
            onConfirm={this.handleDelete}
            toggleModal={() => this.setState({ isOpen: false })}
          />
        </StyledLi>
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

Li.propTypes = {
  item: PropTypes.object,
};

export default Li;
