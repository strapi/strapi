/**
 *
 * InputJSON
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cm from 'codemirror';
import trimStart from 'lodash/trimStart';
import { Stack } from '@strapi/design-system/Stack';
import { FieldHint, FieldError } from '@strapi/design-system/Field';
import jsonlint from './jsonlint';
import { EditorWrapper, StyledBox } from './components';
import Label from './Label';
import FieldWrapper from './FieldWrapper';

const WAIT = 600;
const DEFAULT_THEME = 'blackboard';

const loadCss = async () => {
  await import(
    /* webpackChunkName: "codemirror-javascript" */ 'codemirror/mode/javascript/javascript'
  );
  await import(/* webpackChunkName: "codemirror-addon-lint" */ 'codemirror/addon/lint/lint');
  await import(
    /* webpackChunkName: "codemirror-addon-lint-js" */ 'codemirror/addon/lint/javascript-lint'
  );
  await import(
    /* webpackChunkName: "codemirror-addon-closebrackets" */ 'codemirror/addon/edit/closebrackets'
  );
  await import(
    /* webpackChunkName: "codemirror-addon-mark-selection" */ 'codemirror/addon/selection/mark-selection'
  );
  await import(/* webpackChunkName: "codemirror-css" */ 'codemirror/lib/codemirror.css');
  await import(/* webpackChunkName: "codemirror-theme" */ 'codemirror/theme/blackboard.css');
};

loadCss();

class InputJSON extends React.Component {
  timer = null;

  constructor(props) {
    super(props);
    this.editor = React.createRef();
    this.state = { error: false, markedText: null };
  }

  componentDidMount() {
    // Init codemirror component
    this.codeMirror = cm.fromTextArea(this.editor.current, {
      autoCloseBrackets: true,
      lineNumbers: true,
      matchBrackets: true,
      mode: 'application/json',
      readOnly: this.props.disabled,
      smartIndent: true,
      styleSelectedText: true,
      tabSize: 2,
      theme: DEFAULT_THEME,
      fontSize: '13px',
    });
    this.codeMirror.on('change', this.handleChange);

    this.setSize();
    this.setInitValue();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.value !== this.props.value && !this.codeMirror.state.focused) {
      this.setInitValue();
    }
  }

  setInitValue = () => {
    const { value } = this.props;

    try {
      if (value === null) return this.codeMirror.setValue('');

      return this.codeMirror.setValue(value);
    } catch (err) {
      return this.setState({ error: true });
    }
  };

  setSize = () => this.codeMirror.setSize('100%', 'auto');

  getContentAtLine = line => this.codeMirror.getLine(line);

  getEditorOption = opt => this.codeMirror.getOption(opt);

  getValue = () => this.codeMirror.getValue();

  markSelection = ({ message }) => {
    let line = parseInt(message.split(':')[0].split('line ')[1], 10) - 1;
    let content = this.getContentAtLine(line);

    if (content === '{') {
      line += 1;
      content = this.getContentAtLine(line);
    }
    const chEnd = content.length;
    const chStart = chEnd - trimStart(content, ' ').length;
    const markedText = this.codeMirror.markText(
      { line, ch: chStart },
      { line, ch: chEnd },
      { className: 'colored' }
    );
    this.setState({ markedText });
  };

  handleChange = (doc, change) => {
    if (change.origin === 'setValue') {
      return;
    }

    const { name, onChange } = this.props;
    let value = doc.getValue();

    if (value === '') {
      value = null;
    }

    // Update the parent
    onChange({
      target: {
        name,
        value,
        type: 'json',
      },
    });

    // Remove highlight error
    if (this.state.markedText) {
      this.state.markedText.clear();
      this.setState({ markedText: null, error: null });
    }

    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.testJSON(doc.getValue()), WAIT);
  };

  testJSON = value => {
    try {
      jsonlint.parse(value);
    } catch (err) {
      this.markSelection(err);
    }
  };

  render() {
    if (this.state.error) {
      return <div>error json</div>;
    }

    return (
      <FieldWrapper name={this.props.name} hint={this.props.description} error={this.props.error}>
        <Stack spacing={1}>
          <Label
            intlLabel={this.props.intlLabel}
            labelAction={this.props.labelAction}
            name={this.props.name}
            required={this.props.required}
          />
          <StyledBox error={this.props.error}>
            <EditorWrapper disabled={this.props.disabled}>
              <textarea
                ref={this.editor}
                autoComplete="off"
                id={this.props.id || this.props.name}
                defaultValue=""
              />
            </EditorWrapper>
          </StyledBox>
          <FieldHint />
          <FieldError />
        </Stack>
      </FieldWrapper>
    );
  }
}

InputJSON.defaultProps = {
  description: null,
  disabled: false,
  id: undefined,
  error: undefined,
  intlLabel: undefined,
  labelAction: undefined,
  onChange: () => {},
  value: null,
  required: false,
};

InputJSON.propTypes = {
  description: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  disabled: PropTypes.bool,
  error: PropTypes.string,
  id: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  labelAction: PropTypes.element,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  value: PropTypes.any,
  required: PropTypes.bool,
};

export default InputJSON;
