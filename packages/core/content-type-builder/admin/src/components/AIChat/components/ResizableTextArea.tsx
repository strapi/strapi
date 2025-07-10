import { useRef, useEffect, useState } from 'react';

import { Box } from '@strapi/design-system';
import { styled } from 'styled-components';

interface TextAreaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  placeholder?: string;
}

const TextAreaElement = styled(Box).attrs({ as: 'textarea' })`
  border: none;
  resize: none;
  background: transparent;
  outline: none !important;
  width: 100%;
  min-height: 44px;
  max-height: 160px;
  line-height: ${({ theme }) => theme.lineHeights[4]};
  font-size: ${({ theme }) => theme.fontSizes[2]};
  color: ${({ theme }) => theme.colors.neutral800};
  padding-bottom: ${({ theme }) => theme.spaces[1]};
  overflow-y: auto;

  /* Show partial lines when content exceeds visible area */
  height: ${({ rows, theme }) =>
    rows === 5
      ? `calc(${rows} * ${theme.lineHeights[4]} * 1em + 0.7em)`
      : `calc(${rows} * ${theme.lineHeights[4]} * 1em)`};

  &:disabled,
  &::placeholder {
    color: ${({ theme }) => theme.colors.neutral600};
  }
`;

export const ResizableTextArea = ({ value, onChange, onSubmit, placeholder }: TextAreaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [rows, setRows] = useState(1);

  const calculateRows = (text: string) => {
    if (!text) return 1;
    // Count newlines in the text
    const lineCount = (text.match(/\n/g) || []).length + 1;
    // Limit to a maximum of 5 rows
    return Math.min(lineCount, 5);
  };

  // Update rows when value changes
  useEffect(() => {
    setRows(calculateRows(value));
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!textareaRef.current?.value.trim()) {
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && onSubmit) {
      e.preventDefault();
      onSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      // Ensure focus is maintained after submission using a small delay
      // This helps ensure the focus happens after any other effects from submission
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 10);
    }
  };

  useEffect(() => {
    textareaRef.current?.focus();
  }, [textareaRef]);

  return (
    <TextAreaElement
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      rows={rows}
    />
  );
};
