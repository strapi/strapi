/**
 *
 * WysiwygEditor
 *
 */

import React from 'react';
import { Editor } from 'draft-js';

class WysiwygEditor extends React.Component {
  render() {
    return (
      <Editor {...this.props} ref={this.props.setRef}/>
    );
  }
}

export default WysiwygEditor;
