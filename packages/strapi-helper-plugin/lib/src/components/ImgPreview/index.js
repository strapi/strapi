/**
 *
 *
 * ImgPreview
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get, isEmpty, isObject } from 'lodash';
import cn from 'classnames';

import styles from './styles.scss';

class ImgPreview extends React.Component {
  state = { imgURL: '', position: 0 };

  componentDidMount() {
    this.setState({
        imgURL: get(this.props.files, ['0', 'url']),
    });
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.isUploading !== this.props.isUploading) {
      const lastFile = nextProps.files.slice(-1)[0];

      this.generateImgURL(lastFile);
      this.setState({ position: nextProps.files.length - 1 });
    }
  }

  /**
   * [generateImgURL description]
   * @param  {FileList} files
   * @return {URL}
   */
  generateImgURL = (file) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      this.setState({
        imgURL: reader.result
      });
    }

    reader.readAsDataURL(file);
  }

  handleClick = (operator) => {
    const { position } = this.state;
    const { files } = this.props;
    let file;
    let nextPosition;

    switch (operator) {
      case '+':
        file = files[position + 1] || files[0];
        nextPosition = files[position + 1] ? position + 1 : 0;
        break;
      case '-':
        file = files[position - 1] || files[files.length - 1];
        nextPosition = files[position - 1] ? position - 1 : files.length - 1;
        break;
      default:
        // Do nothing
    }

    if (!file.url) {
      this.generateImgURL(file)
    } else {
      this.setState({ imgURL: file.url });
    }

    this.setState({ position: nextPosition });
  }

  render() {
    return (
      <div>
        <img src={this.state.imgURL} />
        <button className="btn btn-primary" onClick={() => this.handleClick('+')}>
          +
        </button>
        <button className="btn btn-primary" onClick={() => this.handleClick('-')}>
          -
        </button>
      </div>
    );
  }
}

ImgPreview.defaultProps = {
  files: [{}],
  isUploading: false,
};

ImgPreview.propTypes = {
  files: PropTypes.array,
  isUploading: PropTypes.bool,
};

export default ImgPreview;
