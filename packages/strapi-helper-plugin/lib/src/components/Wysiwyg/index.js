/**
 *
 * Wysiwyg
 *
 */

import React from 'react';
import {  ContentState, convertFromHTML, Editor, EditorState } from 'draft-js';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isEmpty } from 'lodash';
import cn from 'classnames';

import styles from './styles.scss';

class Wysiwyg extends React.Component {
  state = { editorState: EditorState.createEmpty(), isFocused: false, hasInitialValue: false };

  componentDidMount() {
    if (this.props.autoFocus) {
      this.focus();
    }

    if (!isEmpty(this.props.value)) {
      this.setInitialValue(this.props);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.value !== this.props.value && !this.state.hasInitialValue) {
      this.setInitialValue(nextProps);
    }
  }

  focus = () => {
    this.setState({ isFocused: true });
    this.domEditor.focus();
  }

  handleBlur = (editorState) => {
    this.setState({ isFocused: false });
    this.domEditor.blur();
  }

  /**
   * Determine if the state is empty
   * @return {Boolean}
   */
  isContentStateEmpty = () => !this.state.editorState.getCurrentContent().hasText();

  onChange = (editorState) => {
    const target = {
      name: this.props.name,
      type: 'text',
      value: editorState.getCurrentContent().getPlainText(),
    };

    this.props.onChange({ target });
    this.setState({editorState});
  }

  setDomEditorRef = ref => this.domEditor = ref;

  setInitialValue = (props) => {
    let editorState;
    const blocksFromHTML = convertFromHTML(props.value);
    const contentState = ContentState.createFromBlockArray(blocksFromHTML);
    editorState = EditorState.createWithContent(contentState);

    // Get the cursor at the end
    editorState = EditorState.moveFocusToEnd(editorState);

    this.setState({ editorState, hasInitialValue: true });
  }

  render() {
    const {
      placeholder,
    } = this.props;
    const { editorState } = this.state;

    return (
      <React.Fragment>
        <div className={cn(styles.editorWrapper, this.state.isFocused && styles.editorFocus)} onClick={this.focus}>
          <FormattedMessage id={placeholder} defaultMessage={placeholder}>
            {(message) => (
              <Editor
                editorState={editorState}
                onChange={this.onChange}
                onBlur={this.handleBlur}
                ref={this.setDomEditorRef}
              />
            )}
          </FormattedMessage>
        </div>
        <input
          className={styles.editorInput}
          type="button"
          value=""
          tabIndex="-1"
        />
      </React.Fragment>
    );
  }
}

Wysiwyg.defaultProps = {
  autoFocus: false,
  placeholder: 'app.utils.placeholder.defaultMessage',
};

Wysiwyg.propTypes = {
  autoFocus: PropTypes.bool,
  placeholder: PropTypes.string,
};

export default Wysiwyg;
