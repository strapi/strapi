/**
 *
 *
 * ImgPreview
 *
 */

/* eslint-disable no-console */
import React from 'react';
import PropTypes from 'prop-types';
import { get, has, isArray, isEmpty, startsWith, size } from 'lodash';
import cn from 'classnames';

import BkgImg from '../../assets/icons/icon_upload.svg';
import ImgPreviewArrow from '../ImgPreviewArrow';
import ImgPreviewHint from '../ImgPreviewHint';

import styles from './styles.scss';

/* eslint-disable react/no-unused-state */
class ImgPreview extends React.Component {
  state = {
    imgURL: '',
    isDraging: false,
    isOver: false,
    isOverArrow: false,
    isImg: false,
    isInitValue: false,
  };

  componentDidMount() {
    // We don't need the generateImgURL function here since the compo will
    // always have an init value here
    const file = this.props.multiple ? get(this.props.files, ['0', 'name'], '') : get(this.props.files, 'name');
    this.setState({
      imgURL: get(this.props.files, ['0', 'url'], '') || get(this.props.files, 'url', ''),
      isImg: this.isPictureType(file),
    });
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.isUploading !== this.props.isUploading) {
      const lastFile = this.props.multiple ? nextProps.files.slice(-1)[0] : nextProps.files[0] || nextProps.files;
      this.generateImgURL(lastFile);

      if (this.props.multiple) {
        this.updateFilePosition(nextProps.files.length - 1);
      }
    }
    // Update the preview or slide pictures or init the component
    if (nextProps.didDeleteFile !== this.props.didDeleteFile || nextProps.position !== this.props.position || size(nextProps.files) !== size(this.props.files) && !this.state.isInitValue) {
      const file = nextProps.files[nextProps.position] || nextProps.files || '';
      this.generateImgURL(file);

      if (!this.state.isInitValue) {
        this.setState({ isInitValue: true });
      }
    }

    if (isEmpty(nextProps.files)) {
      this.setState({ isImg: false, imgURL: null });
    }
  }

  componentDidCatch(error, info) {
    console.log('An error occured in ImgPreview', info);
  }

  getFileType = (fileName) => fileName.split('.').slice(-1)[0];

  /**
   * [generateImgURL description]
   * @param  {FileList} files
   * @return {URL}
   */
  generateImgURL = (file) => {
    if (this.isPictureType(file.name) && !has(file, 'url')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        this.setState({
          imgURL: reader.result,
          isImg: true,
        });
      };

      reader.readAsDataURL(file);
    } else if (has(file, 'url')) {
      const isImg = this.isPictureType(file.name);
      const imgURL = file.url[0] === '/' ?`${strapi.backendURL}${file.url}` :file.url;

      this.setState({ isImg, imgURL });
    } else {
      this.setState({ isImg: false, imgURL: file.name });
    }
  }

  handleClick = (type) => {
    const { files, position } = this.props;
    let file; // eslint-disable-line no-unused-vars
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

    // Update the parent position
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

  // TODO change logic to depend on the type
  isPictureType = (fileName) => /\.(jpe?g|png|gif)$/i.test(fileName);

  updateFilePosition = (newPosition) => {
    this.props.updateFilePosition(newPosition);
  }

  renderContent = () => {
    const fileType = this.getFileType(this.state.imgURL);
    
    if (this.state.isImg) {
      const imgURL = startsWith(this.state.imgURL, '/') ? `${strapi.backendURL}${this.state.imgURL}` : this.state.imgURL;

      return (
        <img src={imgURL} alt="" />
      );
    }

    return (
      <div className={styles.fileIcon} onDrop={this.handleDrop}>
        <i className={`fa fa-file-${fileType}-o`} />
      </div>
    );
  }

  render() {
    const { files, onBrowseClick } = this.props;
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
        className={cn(
          styles.imgPreviewContainer,
        )}
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
          displayHint={isEmpty(files)}
          onClick={onBrowseClick}
          onDrop={this.handleDrop}
          showWhiteHint={this.state.isDraging || isEmpty(files)}
        />
        { !isEmpty(imgURL) && this.renderContent() }
        <ImgPreviewArrow
          enable={isArray(files) && size(files) > 1}
          onClick={this.handleClick}
          onMouseEnter={() => this.setState({ isOverArrow: true })}
          onMouseLeave={() => this.setState({ isOverArrow: false })}
          show={isArray(files) && size(files) > 1}
          type="right"
        />
        <ImgPreviewArrow
          enable={isArray(files) && size(files) > 1}
          onClick={this.handleClick}
          onMouseEnter={() => this.setState({ isOverArrow: true })}
          onMouseLeave={() => this.setState({ isOverArrow: false })}
          show={isArray(files) && size(files) > 1}
        />
      </div>
    );
  }
}

ImgPreview.defaultProps = {
  didDeleteFile: false,
  files: [],
  isUploading: false,
  multiple: false,
  onBrowseClick: () => {},
  onDrop: () => {},
  position: 0,
  updateFilePosition: () => {},
};

ImgPreview.propTypes = {
  didDeleteFile: PropTypes.bool,
  files: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array,
  ]),
  isUploading: PropTypes.bool,
  multiple: PropTypes.bool,
  onBrowseClick: PropTypes.func,
  onDrop: PropTypes.func,
  position: PropTypes.number,
  updateFilePosition: PropTypes.func,
};

export default ImgPreview;
