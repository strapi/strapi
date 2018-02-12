/**
 *
 *
 * ImgPreview
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { cloneDeep, get, isEmpty, isObject, size } from 'lodash';
import cn from 'classnames';

import styles from './styles.scss';

class ImgPreview extends React.Component {
  state = { imgURL: '', position: 0, isImg: false };

  componentDidMount() {
    // We don't need the generateImgURL function here since the compo will
    // always have an init value here
    this.setState({
        imgURL: get(this.props.files, ['0', 'url'], ''),
    });
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.isUploading !== this.props.isUploading) {
      const lastFile = nextProps.files.slice(-1)[0];

      this.generateImgURL(lastFile);
      this.updateFilePosition(nextProps.files.length - 1);
      // this.setState({ position: nextProps.files.length - 1 });
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
      this.setState({ imgURL: file.url });
    }

    // this.setState({ position: nextPosition });
    this.updateFilePosition(nextPosition);
  }

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
    // this.setState({ position: nextPosition });
    // this.props.updateFilePosition(nextPosition);

    if (!nextFile.url) {
      this.generateImgURL(nextFile);
    } else {
      this.setState({ imgURL: nextFile.url });
    }
  }

  renderArrow = (type = 'left') => (
    <div
      className={cn(
        styles.arrowContainer,
        type === 'left' && styles.arrowLeft,
        type !== 'left' && styles.arrowRight,
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleClick(type);
      }}
    />
  )

  renderIconRemove = () => (
    <div className={styles.iconContainer} onClick={this.removeFile}>
      <i className="fa fa-times" />
    </div>
  )

  updateFilePosition = (newPosition) => {
    this.setState({ position: newPosition });
    this.props.updateFilePosition(newPosition);
  }

  render() {
    const { files, multiple } = this.props;
    console.log(this.state.imgURL);
    // TODO handle logo Img
    // { isEmpty(files) && <div className={styles.icon}><img src={Logo} /></div> }
    return (
      <div className={styles.imgPreviewContainer}>
        { !isEmpty(files) && this.renderIconRemove() }
        { !isEmpty(this.state.imgURL) && <img src={this.state.imgURL} /> }
        { multiple && size(files) > 1 && this.renderArrow('right') }
        { multiple && size(files) > 1 && this.renderArrow('left') }
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
  updateFilePosition: () => {},
};

ImgPreview.propTypes = {
  files: PropTypes.array,
  isUploading: PropTypes.bool,
  multiple: PropTypes.bool,
  name: PropTypes.string,
  onChange: PropTypes.func,
  updateFilePosition: PropTypes.func,
};

export default ImgPreview;
