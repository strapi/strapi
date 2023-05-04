import React from 'react';

export default function Type({ children }) {
  return (
    <span
      style={{
        color: '#017501',
      }}
    >
      &lt;{children}&gt;
    </span>
  );
}
