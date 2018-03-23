/**
 *
 * Utils components for the WYSIWYG
 * It includes decorators toggle buttons...
 *
 */

import React from 'react';
import { CompositeDecorator, ContentState, convertFromHTML, EditorState } from 'draft-js';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { isEmpty } from 'lodash';
import Select from 'components/InputSelect';
import WysiwygEditor from 'components/WysiwygEditor';

import { SELECT_OPTIONS } from './constants';
import converter from './converter';
import { getBlockStyle } from './helpers';
import { findLinkEntities, findImageEntities } from './strategies';

import styles from './styles.scss';
/* eslint-disable react/no-multi-comp */

class CustomSelect extends React.Component {
  render() {
    const { isPreviewMode, headerValue, isFullscreen, handleChangeSelect } = this.context;
    const selectClassName = isFullscreen ? styles.selectFullscreen : styles.editorSelect;

    return (
      <div className={selectClassName}>
        <Select
          disabled={isPreviewMode}
          name="headerSelect"
          onChange={handleChangeSelect}
          value={headerValue}
          selectOptions={SELECT_OPTIONS}
        />
      </div>
    );
  }
}

CustomSelect.contextTypes = {
  handleChangeSelect: PropTypes.func,
  headerValue: PropTypes.string,
  isPreviewMode: PropTypes.bool,
  isFullscreen: PropTypes.bool,
};

const Image = props => {
  const { alt, height, src, width } = props.contentState.getEntity(props.entityKey).getData();

  return <img alt={alt} src={src} height={height} width={width} style={{ maxWidth: '100%' }} />;
};

Image.propTypes = {
  contentState: PropTypes.object.isRequired,
  entityKey: PropTypes.string.isRequired,
};

const Link = props => {
  const { url } = props.contentState.getEntity(props.entityKey).getData();

  return (
    <a href={url} style={styles.link}>
      {props.children}
    </a>
  );
};

Link.defaultProps = {
  children: '',
};

Link.propTypes = {
  children: PropTypes.node,
  contentState: PropTypes.object.isRequired,
  entityKey: PropTypes.string.isRequired,
};

const PreviewControl = ({ characters, onClick }) => (
  <div className={styles.previewControlsWrapper} onClick={onClick}>
    <div>
      <span>{characters}&nbsp;</span>
      <FormattedMessage
        id="components.WysiwygBottomControls.charactersIndicators"
      />
    </div>
    <div className={styles.wysiwygCollapse}>
      <FormattedMessage id="components.Wysiwyg.collapse" />
    </div>
  </div>
);

PreviewControl.defaultProps = {
  characters: 0,
  onClick: () => {},
};

PreviewControl.propTypes = {
  characters: PropTypes.number,
  onClick: PropTypes.func,
};

class PreviewWysiwyg extends React.Component {
  getClassName = () => {
    if (this.context.isFullscreen) {
      return cn(styles.editor, styles.editorFullScreen, styles.fullscreenPreviewEditor);
    }

    return styles.editor;
  };

  previewHTML = () => {
    const initHtml = isEmpty(this.context.html) ? '<p></p>' : this.context.html;
    const html = converter.makeHtml(initHtml);
    console.log('h', html);
    const decorator = new CompositeDecorator([
      {
        strategy: findLinkEntities,
        component: Link,
      },
      {
        strategy: findImageEntities,
        component: Image,
      },
    ]);
    const blocksFromHTML = convertFromHTML(html);
    // Make sure blocksFromHTML.contentBlocks !== null
    if (blocksFromHTML.contentBlocks) {
      const contentState = ContentState.createFromBlockArray(
        blocksFromHTML.contentBlocks,
        blocksFromHTML.entityMap,
      );
      return EditorState.createWithContent(contentState, decorator);
    }

    // Prevent errors if value is empty
    return EditorState.createEmpty();
  };

  render() {
    const { placeholder } = this.context;

    return (
      <div className={this.getClassName()}>
        <WysiwygEditor
          blockStyleFn={getBlockStyle}
          editorState={this.previewHTML()}
          onChange={() => {}}
          placeholder={placeholder}
          spellCheck
        />
        <input className={styles.editorInput} value="" tabIndex="-1" />
      </div>
    );
  }
}

PreviewWysiwyg.contextTypes = {
  editorState: PropTypes.func,
  html: PropTypes.string,
  isFullscreen: PropTypes.bool,
  placeholder: PropTypes.string,
};

const ToggleMode = props => {
  const label = props.isPreviewMode
    ? 'components.Wysiwyg.ToggleMode.markdown'
    : 'components.Wysiwyg.ToggleMode.preview';

  return (
    <div className={styles.toggleModeWrapper}>
      <button type="button" className={styles.toggleModeButton} onClick={props.onClick}>
        <FormattedMessage id={label} />
      </button>
    </div>
  );
};

ToggleMode.defaultProps = {
  isPreviewMode: false,
  onClick: () => {},
};

ToggleMode.propTypes = {
  isPreviewMode: PropTypes.bool,
  onClick: PropTypes.func,
};

export { CustomSelect, Image, Link, PreviewControl, PreviewWysiwyg, ToggleMode };
