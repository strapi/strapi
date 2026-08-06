import { useEffect, useId, useRef, useState } from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { ChevronDown } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTrad } from '../../../../utils/getTrad';

const Row = styled(Flex)<{ $depth: number }>`
  padding-right: ${({ theme }) => theme.spaces[3]};

  padding-block: ${({ theme }) => theme.spaces[1]};

  padding-left: ${({ theme, $depth }) =>
    `calc(${$depth} * ${theme.spaces[6]} + ${theme.spaces[3]})`};

  gap: ${({ theme }) => theme.spaces[2]};
`;

const NameInput = styled.input<{ $hasError: boolean }>`
  flex: 1;

  min-width: 0;
  padding: 4px 8px;

  background: ${({ theme }) => theme.colors.neutral0};
  border: 1px solid
    ${({ $hasError, theme }) => ($hasError ? theme.colors.danger600 : theme.colors.primary600)};
  border-radius: ${({ theme }) => theme.borderRadius};

  font-weight: ${({ theme }) => theme.fontWeights.semiBold};
  color: ${({ theme }) => theme.colors.neutral800};
  font-size: ${({ theme }) => theme.fontSizes[1]};

  &:focus {
    outline: none;
  }
`;

const ErrorBox = styled(Box)<{ $depth: number }>`
  padding-left: ${({ theme, $depth }) =>
    `calc(${$depth} * (${theme.spaces[3]} + ${theme.spaces[6]} + ${theme.spaces[6]}))`};
`;

interface FolderNameFieldProps {
  defaultValue: string;
  depth: number;

  /**
   * Function to validate a draft entry. Return an error message to block acceptance, or `undefined` if the draft is acceptable.
   */
  validate?: (name: string) => string | undefined;

  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export const FolderNameField = ({
  defaultValue,
  onSubmit,
  onCancel,
  validate,
  depth,
}: FolderNameFieldProps) => {
  const { formatMessage } = useIntl();
  const errorId = useId();

  const [error, setError] = useState<string | undefined>(undefined);
  const [value, setValue] = useState(defaultValue);

  const inputRef = useRef<HTMLInputElement>(null);
  const settledRef = useRef(false); // Guards against Enter and the subsequent blur both firing.

  useEffect(() => {
    inputRef.current?.select();
    inputRef.current?.focus();
  }, []);

  const handleChange = (next: string) => {
    setValue(next);

    const trimmed = next.trim();
    setError(trimmed.length > 0 ? validate?.(trimmed) : undefined);
  };

  const commitFromEnter = () => {
    if (settledRef.current) {
      return;
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      settledRef.current = true;

      onCancel();
      return;
    }

    const validationError = validate?.(trimmed);

    if (validationError) {
      setError(validationError);
      inputRef.current?.focus();

      return;
    }

    settledRef.current = true;
    onSubmit(trimmed);
  };

  const commitFromBlur = () => {
    if (settledRef.current) {
      return;
    }

    settledRef.current = true;
    const trimmed = value.trim();

    // On blur, an empty or invalid name cancels the edit rather than trapping focus.
    if (trimmed.length === 0 || validate?.(trimmed)) {
      onCancel();
      return;
    }

    onSubmit(trimmed);
  };

  const cancel = () => {
    if (settledRef.current) {
      return;
    }

    settledRef.current = true;
    onCancel();
  };

  const onNameInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(event.target.value);
  };

  const onNameInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitFromEnter();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  };

  return (
    <Box>
      <Row $depth={depth} alignItems="center">
        <Box tag="span" width="16px" flex="0 0 auto" aria-hidden>
          <ChevronDown fill="neutral500" style={{ transform: 'rotate(-90deg)' }} />
        </Box>
        <NameInput
          ref={inputRef}
          value={value}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          aria-label={formatMessage({
            id: getTrad('nav.folder.name-label'),
            defaultMessage: 'Folder name',
          })}
          onKeyDown={onNameInputKeyDown}
          onChange={onNameInputChange}
          onBlur={commitFromBlur}
          $hasError={Boolean(error)}
        />
      </Row>
      {error && (
        <ErrorBox $depth={depth} paddingTop={1}>
          <Typography id={errorId} variant="pi" textColor="danger600">
            {error}
          </Typography>
        </ErrorBox>
      )}
    </Box>
  );
};
