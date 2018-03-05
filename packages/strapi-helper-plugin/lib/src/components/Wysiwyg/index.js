/**
 *
 * Wysiwyg
 *
 */

import React from 'react';
import { Editor, EditorState } from 'draft-js';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import styles from './styles.scss';

class Wysiwyg extends React.Component {
  state = { editorState: EditorState.createEmpty(), isFocused: false };

  componentDidMount() {
    if (this.props.autoFocus) {
      this.focus();
    }
  }

  focus = () => {
    this.setState({ isFocused: true });
    this.domEditor.focus();
  }

  handleBlur = (editorState) => {
    this.setState({ isFocused: false });
  }

  /**
   * Determine if the state is empty
   * @return {Boolean} 
   */
  isContentStateEmpty = () => !this.state.editorState.getCurrentContent().hasText();

  onChange = (editorState) => this.setState({editorState});

  setDomEditorRef = ref => this.domEditor = ref;

  render() {
    const {
      placeholder,
    } = this.props;
    const { editorState } = this.state;

    return (
      <div className={cn(styles.editorWrapper, this.state.isFocused && styles.editorFocus)} onClick={this.focus}>
        <FormattedMessage id={placeholder} defaultMessage={placeholder}>
          {(message) => (
            <Editor
              editorState={editorState}
              onChange={this.onChange}
              onBlur={this.handleBlur}
              placeholder={message}
              ref={this.setDomEditorRef}
            />
          )}
        </FormattedMessage>
      </div>
    );
  }
}

Wysiwyg.defaultProps = {
  autoFocus: true,
  placeholder: 'app.utils.placeholder.defaultMessage',
};

Wysiwyg.propTypes = {
  autoFocus: PropTypes.bool,
  placeholder: PropTypes.string,
};

export default Wysiwyg;
