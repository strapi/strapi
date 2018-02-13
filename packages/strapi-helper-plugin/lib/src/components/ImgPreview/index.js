/**
 *
 *
 * ImgPreview
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { cloneDeep, get, isEmpty, isObject, size } from 'lodash';
import cn from 'classnames';

import BkgImg  from 'assets/icons/icon_upload.svg';
import ImgPreviewArrow from 'components/ImgPreviewArrow';
import ImgPreviewRemoveIcon from 'components/ImgPreviewRemoveIcon';
import ImgPreviewHint from 'components/ImgPreviewHint';

import styles from './styles.scss';

class ImgPreview extends React.Component {
  state = {
    imgURL: '',
    isDraging: false,
    isImg: false,
    position: 0,
  };

  componentDidMount() {
    // We don't need the generateImgURL function here since the compo will
    // always have an init value here
    this.setState({
        imgURL: get(this.props.files, ['0', 'url'], ''),
        isImg: this.isPictureType(get(this.props.files, ['0', 'name'], '')),
    });
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.isUploading !== this.props.isUploading) {
      const lastFile = nextProps.files.slice(-1)[0];
      this.generateImgURL(lastFile);
      this.updateFilePosition(nextProps.files.length - 1);
    }
  }

  getFileType = (fileName) => fileName.split('.').slice(-1)[0];

  /**
   * [generateImgURL description]
   * @param  {FileList} files
   * @return {URL}
   */
  generateImgURL = (file) => {
    if ( /\.(jpe?g|png|gif)$/i.test(file.name) ) {
      const reader = new FileReader();
      reader.onloadend = () => {
        this.setState({
          imgURL: reader.result,
          isImg: true,
        });
      }

      reader.readAsDataURL(file);
    } else {
      this.setState({ isImg: false, imgURL: file.name });
    }
  }

  handleClick = (type) => {
    const { position } = this.state;
    const { files } = this.props;
    let file;
    let nextPosition;

    switch (type) {
      case 'right':
        file = files[position + 1] || files[0];
        nextPosition = files[position + 1] ? position + 1 : 0;
        break;
      case 'left':
        file = files[position - 1] || files[files.length - 1];
        nextPosition = files[position - 1] ? position - 1 : files.length - 1;
        break;
      default:
        // Do nothing
    }

    if (!file.url) {
      this.generateImgURL(file)
    } else {
      this.setState({ imgURL: file.url, isImg: this.isPictureType(file.url) });
    }

    this.updateFilePosition(nextPosition);
  }

  handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ isDraging: true });
  }

  handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ isDraging: false });
  }

  handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  }

  handleDrop = (e) => {
    this.setState({ isDraging: false });
    this.props.onDrop(e);
  }

  isPictureType = (fileName) => /\.(jpe?g|png|gif)$/i.test(fileName);

  removeFile = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const value = cloneDeep(this.props.files);
    value.splice(this.state.position, 1);

    const target = {
      name: this.props.name,
      type: 'file',
      value,
    };

    this.props.onChange({ target });

    if (size(value) === 0) {
      this.setState({ position: 0, imgURL: '' });
      return this.props.updateFilePosition(0);
    }

    // Display the last file
    const nextFile = value.slice(-1)[0];
    const nextPosition = value.length -1;

    this.updateFilePosition(nextPosition);

    if (!nextFile.url) {
      this.generateImgURL(nextFile);
    } else {
      this.setState({ imgURL: nextFile.url });
    }
  }

  renderContent = () => {
    const fileType = this.getFileType(this.state.imgURL);

    if (this.state.isImg) {
      return (
        <img src={this.state.imgURL} />
      );
    } else {
      return (
        <div className={styles.fileIcon}>
          <i className={`fa fa-file-${fileType}-o`} />
        </div>
      );
    }
  }

  updateFilePosition = (newPosition) => {
    this.setState({ position: newPosition });
    this.props.updateFilePosition(newPosition);
  }

  render() {
    const { files, multiple } = this.props;
    const { imgURL } = this.state;
    const containerStyle = isEmpty(imgURL) ?
      {
        backgroundImage: `url(${BkgImg})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        zIndex: 9999,
      } : {};

    return (
        <div
          className={cn(this.state.isDraging && styles.overed, styles.imgPreviewContainer)}
          onDragOver={this.handleDragOver}
          onDragEnter={this.handleDragEnter}
          style={containerStyle}
        >
          <div
            className={cn(this.state.isDraging && styles.overlay)}
            onDragLeave={this.handleDragLeave}
            onDragOver={this.handleDragOver}
            onDrop={this.handleDrop}
          />
          <ImgPreviewHint
            showWhiteHint={this.state.isDraging}
            displayHint={isEmpty(files)}
          />
          { !isEmpty(imgURL) && this.renderContent() }
          <ImgPreviewRemoveIcon
            onClick={this.removeFile}
            show={!isEmpty(files)}
          />
          <ImgPreviewArrow
            onClick={this.handleClick}
            show={size(files) > 1}
            type="right"
          />
          <ImgPreviewArrow
            onClick={this.handleClick}
            show={size(files) > 1}
          />
        </div>

    );
  }
}

ImgPreview.defaultProps = {
  files: [{}],
  isUploading: false,
  multiple: false,
  name: '',
  onChange: () => {},
  onDrop: () => {},
  updateFilePosition: () => {},
};

ImgPreview.propTypes = {
  files: PropTypes.array,
  isUploading: PropTypes.bool,
  multiple: PropTypes.bool,
  name: PropTypes.string,
  onChange: PropTypes.func,
  onDrop: PropTypes.func,
  updateFilePosition: PropTypes.func,
};

export default ImgPreview;
