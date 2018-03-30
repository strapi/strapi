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
import converter from './converter';
import { findLinkEntities, findImageEntities, findVideoEntities } from './strategies';

import Image from './image';
import Link from './link';
import Video from './video';

import styles from './componentsStyles.scss';

function getBlockStyle(block) {
  switch (block.getType()) {
    case 'blockquote':
      return styles.editorBlockquote;
    case 'code-block':
      return styles.editorCodeBlock;
    case 'unstyled':
      return styles.editorParagraph;
    case 'unordered-list-item':
      return styles.unorderedList;
    case 'ordered-list-item':
    case 'header-one':
    case 'header-two':
    case 'header-three':
    case 'header-four':
    case 'header-five':
    case 'header-six':
    default:
      return null;
  }
}

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
      {
        strategy: findVideoEntities,
        component: Video,
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
