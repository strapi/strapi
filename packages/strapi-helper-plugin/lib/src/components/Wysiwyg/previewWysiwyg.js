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

class PreviewWysiwyg extends React.PureComponent {
  state = { editorState: EditorState.createEmpty(), isMounted: false };

  componentDidMount() {
    const { data } = this.props;
    this.setState({ isMounted: true });

    if (!isEmpty(data)) {
      this.previewHTML(data);
    }
  }

  componentWillUnmount() {
    this.setState({ isMounted: false });
  }

  getClassName = () => {
    if (this.context.isFullscreen) {
      return cn(styles.editor, styles.editorFullScreen, styles.fullscreenPreviewEditor);
    }

    return styles.editor;
  };

  // NOTE: This is not optimal and this lifecycle should be removed
  // I couldn't find a better way to decrease the fullscreen preview's data conversion time
  // Trying with componentDidUpdate didn't work
  UNSAFE_componentWillUpdate(nextProps, nextState) {
    if (nextProps.data !== this.props.data) {
      new Promise(resolve => {
        setTimeout(() => {
          if (nextProps.data === this.props.data && nextState.isMounted) {
            // I use an handler here to update the state wich is fine since the condition above prevent
            // from entering into an infinite loop
            this.previewHTML(nextProps.data);
          }
          resolve();
        }, 300);
      });
    }
  }

  previewHTML = rawContent => {
    const initHtml = isEmpty(rawContent) ? '<p></p>' : rawContent;
    const html = converter.makeHtml(initHtml);
    // This action takes a long time
    const blocksFromHTML = convertFromHTML(html);

    // Make sure blocksFromHTML.contentBlocks !== null
    if (blocksFromHTML.contentBlocks) {
      const contentState = ContentState.createFromBlockArray(
        blocksFromHTML.contentBlocks,
        blocksFromHTML.entityMap,
      );
      return this.setState({ editorState: EditorState.createWithContent(contentState, decorator) });
    }

    // Prevent errors if value is empty
    return this.setState({ editorState: EditorState.createEmpty() });
  };

  render() {
    const { placeholder } = this.context;

    return (
      <div className={this.getClassName()}>
        <WysiwygEditor
          blockStyleFn={getBlockStyle}
          editorState={this.state.editorState}
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
  isFullscreen: PropTypes.bool,
  placeholder: PropTypes.string,
};

PreviewWysiwyg.defaultProps = {
  data: '',
};

PreviewWysiwyg.propTypes = {
  data: PropTypes.string,
};

export default PreviewWysiwyg;
