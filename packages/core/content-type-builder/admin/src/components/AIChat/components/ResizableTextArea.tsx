import { useRef, useEffect } from 'react';

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

  ::placeholder {
    color: ${({ theme }) => theme.colors.neutral500};
  }

  &:disabled {
    color: ${({ theme }) => theme.colors.neutral600};
  }
`;

export const ResizableTextArea = ({ value, onChange, onSubmit, placeholder }: TextAreaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      rows={1}
    />
  );
};
