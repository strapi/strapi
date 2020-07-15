import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import hljs from 'highlight.js';
// Dark theme
// import 'highlight.js/styles/night-owl.css';
import 'highlight.js/styles/github.css';

const CodeBlock = ({ language, value }) => {
  const ref = useRef();

  useEffect(() => {
    hljs.highlightBlock(ref.current);
  }, [value]);

  return (
    <pre>
      <code ref={ref} className={`language-${language || 'bash'}`}>
        {value}
      </code>
    </pre>
  );
};

CodeBlock.defaultProps = {
  language: '',
  value: '',
};

CodeBlock.propTypes = {
  language: PropTypes.string,
  value: PropTypes.string,
};

export default CodeBlock;
