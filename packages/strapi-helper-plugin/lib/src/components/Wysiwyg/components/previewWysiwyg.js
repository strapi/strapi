/**
 *
 * PreviewWysiwyg
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { CompositeDecorator, ContentState, convertFromHTML, EditorState } from 'draft-js';
import cn from 'classnames';
import { isEmpty } from 'lodash';

import WysiwygEditor from 'components/WysiwygEditor';
import converter from '../converter';
import { getBlockStyle } from '../helpers';
import { findLinkEntities, findImageEntities } from '../strategies';

import styles from './styles.scss';
import { Image, Link } from './index';

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

export default PreviewWysiwyg;
