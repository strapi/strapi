/**
 *
 * PreviewWysiwyg
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  CompositeDecorator,
  ContentState,
  convertFromHTML,
  EditorState,
  ContentBlock,
  genKey,
  Entity,
  CharacterMetadata,
} from 'draft-js';
import { List, OrderedSet, Repeat, fromJS } from 'immutable';
import { isEmpty, toArray } from 'lodash';
import WysiwygContext from '../../contexts/Wysiwyg';
import WysiwygEditor from '../WysiwygEditor';
import converter from './converter';
import {
  findAtomicEntities,
  findLinkEntities,
  findImageEntities,
  findVideoEntities,
} from './strategies';
import PreviewWysiwygWrapper from './PreviewWysiwygWrapper';
import Image from './image';
import Link from './link';
import Video from './video';

/* eslint-disable react/no-unused-state */
/* eslint-disable no-new */
/* eslint-disable consistent-return */
/* eslint-disable react/sort-comp */
function getBlockStyle(block) {
  switch (block.getType()) {
    case 'blockquote':
      return 'editorBlockquote';
    case 'code-block':
      return 'editorCodeBlock';
    case 'unstyled':
      return 'editorParagraph';
    case 'unordered-list-item':
      return 'unorderedList';
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
  {
    strategy: findAtomicEntities,
    component: Link,
  },
]);

const getBlockSpecForElement = aElement => ({
  contentType: 'link',
  aHref: aElement.href,
  aInnerHTML: aElement.innerHTML,
});

const elementToBlockSpecElement = element =>
  wrapBlockSpec(getBlockSpecForElement(element));

const wrapBlockSpec = blockSpec => {
  if (blockSpec == null) {
    return null;
  }
  const tempEl = document.createElement('blockquote');
  // stringify meta data and insert it as text content of temp HTML element. We will later extract
  // and parse it.
  tempEl.innerText = JSON.stringify(blockSpec);

  return tempEl;
};

const replaceElement = (oldEl, newEl) => {
  if (!(newEl instanceof HTMLElement)) {
    return;
  }
  const parentNode = oldEl.parentNode;

  return parentNode.replaceChild(newEl, oldEl);
};

const aReplacer = aElement =>
  replaceElement(aElement, elementToBlockSpecElement(aElement));

const createContentBlock = (blockData = {}) => {
  const { key, type, text, data, inlineStyles, entityData } = blockData;

  let blockSpec = {
    type: type !== null && type !== undefined ? type : 'unstyled',
    text: text !== null && text !== undefined ? text : '',
    key: key !== null && key !== undefined ? key : genKey(),
  };

  if (data) {
    blockSpec.data = fromJS(data);
  }

  if (inlineStyles || entityData) {
    let entityKey;

    if (entityData) {
      const { type, mutability, data } = entityData;
      entityKey = Entity.create(type, mutability, data);
    } else {
      entityKey = null;
    }
    const style = OrderedSet(inlineStyles || []);
    const charData = CharacterMetadata.applyEntity(
      CharacterMetadata.create({ style, entityKey }),
      entityKey
    );
    blockSpec.characterList = List(Repeat(charData, text.length));
  }

  return new ContentBlock(blockSpec);
};

class PreviewWysiwyg extends React.PureComponent {
  state = { editorState: EditorState.createEmpty(), isMounted: false };

  static contextType = WysiwygContext;

  componentDidMount() {
    const { data } = this.props;
    this.setState({ isMounted: true });

    if (!isEmpty(data)) {
      this.previewHTML(data);
    }
  }

  // NOTE: This is not optimal and this lifecycle should be removed
  // I couldn't find a better way to decrease the fullscreen preview's data conversion time
  // Trying with componentDidUpdate didn't work
  UNSAFE_componentWillUpdate(nextProps, nextState) {
    if (nextProps.data !== this.props.data) {
      new Promise(resolve => {
        setTimeout(() => {
          if (nextProps.data === this.props.data && nextState.isMounted) {
            // I use an handler here to update the state which is fine since the condition above prevent
            // from entering into an infinite loop
            this.previewHTML(nextProps.data);
          }
          resolve();
        }, 300);
      });
    }
  }

  componentWillUnmount() {
    this.setState({ isMounted: false });
  }

  previewHTML = rawContent => {
    const initHtml = isEmpty(rawContent) ? '<p></p>' : rawContent;
    const html = new DOMParser().parseFromString(
      converter.makeHtml(initHtml),
      'text/html'
    );
    toArray(html.getElementsByTagName('a')) // Retrieve all the links <a> tags
      .filter(value => value.getElementsByTagName('img').length > 0) // Filter by checking if they have any <img> children
      .forEach(aReplacer); // Change those links into <blockquote> elements so we can set some metacharacters with the img content

    // TODO:
    // in the same way, retrieve all <pre> tags
    // create custom atomic block
    // create custom code block
    let blocksFromHTML = convertFromHTML(html.body.innerHTML);

    if (blocksFromHTML.contentBlocks) {
      blocksFromHTML = blocksFromHTML.contentBlocks.reduce((acc, block) => {
        if (block.getType() === 'blockquote') {
          try {
            const { aHref, aInnerHTML } = JSON.parse(block.getText());
            const entityData = {
              type: 'LINK',
              mutability: 'IMMUTABLE',
              data: {
                aHref,
                aInnerHTML,
              },
            };

            const blockSpec = Object.assign(
              { type: 'atomic', text: ' ', key: block.getKey() },
              { entityData }
            );
            const atomicBlock = createContentBlock(blockSpec); // Create an atomic block so we can identify it easily

            return acc.concat([atomicBlock]);
          } catch (err) {
            return acc.concat(block);
          }
        }

        return acc.concat(block);
      }, []);

      const contentState = ContentState.createFromBlockArray(blocksFromHTML);

      return this.setState({
        editorState: EditorState.createWithContent(contentState, decorator),
      });
    }

    return this.setState({ editorState: EditorState.createEmpty() });
  };

  render() {
    const { placeholder } = this.context;

    return (
      <PreviewWysiwygWrapper isFullscreen={this.context.isFullscreen}>
        <WysiwygEditor
          blockStyleFn={getBlockStyle}
          editorState={this.state.editorState}
          onChange={() => {}}
          placeholder={placeholder}
        />
        <input
          className="editorInput"
          value=""
          onChange={() => {}}
          tabIndex="-1"
        />
      </PreviewWysiwygWrapper>
    );
  }
}

PreviewWysiwyg.defaultProps = {
  data: '',
};

PreviewWysiwyg.propTypes = {
  data: PropTypes.string,
};

export default PreviewWysiwyg;
