import * as React from 'react';
import { Box, Field, Flex, Popover, SingleSelect, SingleSelectOption } from '@strapi/design-system';
import { useField } from '@strapi/strapi/admin';
import { styled } from 'styled-components';

const PRESET_COLORS = [
  '#000000',
  '#4A4A4A',
  '#8B72F5',
  '#E11D48',
  '#2563EB',
  '#16A34A',
  '#CA8A04',
  '#EA580C',
  '#FFFFFF',
];

const Shell = styled.div`
  border: 1px solid ${({ theme, $error }) => ($error ? theme.colors.danger600 : theme.colors.neutral200)};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.neutral0};
  overflow: hidden;
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};
  background: ${({ theme }) => theme.colors.neutral100};
`;

const ToolBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: ${({ $active }) => ($active ? '#e8e8e8' : 'transparent')};
  color: ${({ theme }) => theme.colors.neutral800};
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 600;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.neutral200};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const Divider = styled.span`
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: ${({ theme }) => theme.colors.neutral300};
`;

const ColorMark = styled.span`
  display: inline-block;
  font-weight: 700;
  font-size: 14px;
  line-height: 1;
  border-bottom: 3px solid ${({ $color }) => $color || '#8B72F5'};
  padding-bottom: 1px;
`;

const ColorSwatch = styled.button`
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.neutral300};
  background: ${({ $color }) => $color};
  cursor: pointer;
  padding: 0;
`;

const EditorSurface = styled.div`
  min-height: 280px;
  max-height: 560px;
  overflow: auto;
  padding: 16px 18px;
  outline: none;
  color: ${({ theme }) => theme.colors.neutral800};
  font-size: 14px;
  line-height: 1.6;
  cursor: text;

  &:empty:before {
    content: attr(data-placeholder);
    color: ${({ theme }) => theme.colors.neutral500};
  }

  h1,
  h2,
  h3,
  h4 {
    font-weight: 700;
    margin: 0.8em 0 0.4em;
    line-height: 1.3;
  }

  h1 {
    font-size: 1.75em;
  }

  h2 {
    font-size: 1.35em;
  }

  h3 {
    font-size: 1.15em;
  }

  p {
    margin: 0 0 0.75em;
  }

  img,
  video,
  iframe {
    max-width: 100%;
    height: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.75em 0;
  }

  td,
  th {
    border: 1px solid ${({ theme }) => theme.colors.neutral300};
    padding: 8px;
    min-width: 48px;
  }

  a {
    color: ${({ theme }) => theme.colors.primary600};
  }

  ul,
  ol {
    padding-left: 1.4em;
    margin: 0 0 0.75em;
  }

  [style*='text-align: center'] {
    text-align: center;
  }
`;

const SourceArea = styled.textarea`
  display: block;
  width: 100%;
  min-height: 280px;
  max-height: 560px;
  padding: 16px 18px;
  border: 0;
  resize: vertical;
  outline: none;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  background: ${({ theme }) => theme.colors.neutral0};
  color: ${({ theme }) => theme.colors.neutral800};
`;

const toYoutubeEmbed = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${parsed.pathname.replace('/', '')}`;
    }
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      if (id) {
        return `https://www.youtube.com/embed/${id}`;
      }
    }
  } catch {
    return null;
  }
  return null;
};

export const HtmlEditorInput = React.forwardRef((props, forwardedRef) => {
  const { hint, disabled, labelAction, label, name, placeholder, required } = props;
  const field = useField(name);
  const editorRef = React.useRef(null);
  const lastHtml = React.useRef(field.value || '');
  const [sourceMode, setSourceMode] = React.useState(false);
  const [color, setColor] = React.useState('#8B72F5');
  const [block, setBlock] = React.useState('p');

  React.useEffect(() => {
    if (sourceMode || !editorRef.current) {
      return;
    }
    const next = field.value || '';
    if (next !== editorRef.current.innerHTML && next !== lastHtml.current) {
      editorRef.current.innerHTML = next;
      lastHtml.current = next;
    }
  }, [field.value, sourceMode]);

  const emitChange = React.useCallback(() => {
    if (!editorRef.current) {
      return;
    }
    const html = editorRef.current.innerHTML;
    lastHtml.current = html;
    field.onChange(name, html);
  }, [field, name]);

  const run = (command, value) => {
    if (disabled || sourceMode) {
      return;
    }
    editorRef.current?.focus();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(command, false, value);
    emitChange();
  };

  const applyColor = (nextColor) => {
    setColor(nextColor);
    run('foreColor', nextColor);
  };

  const applyBlock = (tag) => {
    setBlock(tag);
    run('formatBlock', `<${tag}>`);
  };

  const insertHtml = (html) => {
    run('insertHTML', html);
  };

  const isSafeUrl = (url) => /^(https?:|\/)/i.test(url);

  const handleLink = () => {
    const href = window.prompt('Link URL', 'https://');
    if (!href || !isSafeUrl(href)) {
      return;
    }
    run('createLink', href);
  };

  const handleImage = () => {
    const src = window.prompt('Image URL', 'https://');
    if (!src || !isSafeUrl(src)) {
      return;
    }
    const alt = (window.prompt('Image alt text', '') || '').replace(/"/g, '&quot;');
    insertHtml(`<img src="${src.replace(/"/g, '&quot;')}" alt="${alt}" />`);
  };

  const handleVideo = () => {
    const url = window.prompt('Video URL (YouTube or direct file)', 'https://');
    if (!url || !isSafeUrl(url)) {
      return;
    }
    const embed = toYoutubeEmbed(url);
    if (embed) {
      insertHtml(
        `<iframe src="${embed}" width="560" height="315" title="Video" frameborder="0" allowfullscreen></iframe>`
      );
      return;
    }
    insertHtml(
      `<video src="${url.replace(/"/g, '&quot;')}" controls style="max-width:100%"></video>`
    );
  };

  const handleTable = () => {
    insertHtml(
      '<table><thead><tr><th>Heading</th><th>Heading</th></tr></thead><tbody><tr><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td></tr></tbody></table><p></p>'
    );
  };

  return (
    <Field.Root name={name} id={name} error={field.error} hint={hint} required={required}>
      <Flex direction="column" alignItems="stretch" gap={1}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <Shell $error={Boolean(field.error)}>
          <Toolbar>
            <SingleSelect
              size="S"
              disabled={disabled || sourceMode}
              value={block}
              onChange={applyBlock}
              aria-label="Block format"
            >
              <SingleSelectOption value="p">Paragraph</SingleSelectOption>
              <SingleSelectOption value="h1">Heading 1</SingleSelectOption>
              <SingleSelectOption value="h2">Heading 2</SingleSelectOption>
              <SingleSelectOption value="h3">Heading 3</SingleSelectOption>
              <SingleSelectOption value="h4">Heading 4</SingleSelectOption>
              <SingleSelectOption value="blockquote">Quote</SingleSelectOption>
            </SingleSelect>
            <Divider />
            <ToolBtn type="button" disabled={disabled || sourceMode} onClick={() => run('bold')} title="Bold">
              B
            </ToolBtn>
            <ToolBtn type="button" disabled={disabled || sourceMode} onClick={() => run('italic')} title="Italic">
              <em>I</em>
            </ToolBtn>
            <ToolBtn
              type="button"
              disabled={disabled || sourceMode}
              onClick={() => run('underline')}
              title="Underline"
            >
              <u>U</u>
            </ToolBtn>
            <Popover.Root>
              <Popover.Trigger>
                <ToolBtn type="button" disabled={disabled || sourceMode} title="Text color">
                  <ColorMark $color={color}>A</ColorMark>
                </ToolBtn>
              </Popover.Trigger>
              <Popover.Content sideOffset={6}>
                <Box padding={3}>
                  <Flex gap={2} wrap="wrap" style={{ width: 160 }}>
                    {PRESET_COLORS.map((preset) => (
                      <ColorSwatch
                        key={preset}
                        type="button"
                        $color={preset}
                        title={preset}
                        onClick={() => applyColor(preset)}
                      />
                    ))}
                  </Flex>
                  <Box paddingTop={3}>
                    <input
                      type="color"
                      value={color}
                      aria-label="Custom text color"
                      onChange={(event) => applyColor(event.target.value)}
                      style={{ width: '100%', height: 32, border: 0, background: 'transparent', cursor: 'pointer' }}
                    />
                  </Box>
                </Box>
              </Popover.Content>
            </Popover.Root>
            <Divider />
            <ToolBtn
              type="button"
              disabled={disabled || sourceMode}
              onClick={() => run('justifyLeft')}
              title="Align left"
            >
              ≡
            </ToolBtn>
            <ToolBtn
              type="button"
              disabled={disabled || sourceMode}
              onClick={() => run('justifyCenter')}
              title="Align center"
            >
              ≣
            </ToolBtn>
            <ToolBtn
              type="button"
              disabled={disabled || sourceMode}
              onClick={() => run('justifyRight')}
              title="Align right"
            >
              ≡
            </ToolBtn>
            <Divider />
            <ToolBtn type="button" disabled={disabled || sourceMode} onClick={handleLink} title="Insert link">
              🔗
            </ToolBtn>
            <ToolBtn type="button" disabled={disabled || sourceMode} onClick={handleImage} title="Insert image">
              🖼
            </ToolBtn>
            <ToolBtn type="button" disabled={disabled || sourceMode} onClick={handleVideo} title="Insert video">
              ▶
            </ToolBtn>
            <ToolBtn type="button" disabled={disabled || sourceMode} onClick={handleTable} title="Insert table">
              ⊞
            </ToolBtn>
            <div style={{ marginLeft: 'auto' }}>
              <ToolBtn
                type="button"
                $active={sourceMode}
                disabled={disabled}
                onClick={() => {
                  if (!sourceMode && editorRef.current) {
                    lastHtml.current = editorRef.current.innerHTML;
                    field.onChange(name, editorRef.current.innerHTML);
                  }
                  setSourceMode((current) => !current);
                }}
                title="HTML source"
              >
                {'</>'}
              </ToolBtn>
            </div>
          </Toolbar>
          {sourceMode ? (
            <SourceArea
              ref={forwardedRef}
              disabled={disabled}
              value={field.value || ''}
              placeholder={placeholder || '<p>Write HTML…</p>'}
              onChange={(event) => field.onChange(name, event.target.value)}
            />
          ) : (
            <EditorSurface
              ref={(node) => {
                editorRef.current = node;
                if (typeof forwardedRef === 'function') {
                  forwardedRef(node);
                } else if (forwardedRef) {
                  forwardedRef.current = node;
                }
                if (node && !node.innerHTML && field.value) {
                  node.innerHTML = field.value;
                }
              }}
              contentEditable={!disabled}
              suppressContentEditableWarning
              data-placeholder={placeholder || 'Write your article…'}
              onInput={emitChange}
              onBlur={emitChange}
            />
          )}
        </Shell>
        <Field.Hint />
        <Field.Error />
      </Flex>
    </Field.Root>
  );
});

HtmlEditorInput.displayName = 'HtmlEditorInput';
