import * as React from 'react';

import { useStrapiApp } from '@strapi/admin/strapi-admin';
import { Box, Flex, FlexComponent, Link, Typography } from '@strapi/design-system';
import { File as FileIcon, Trash } from '@strapi/icons';
import { Schema } from '@strapi/types';
import { Editor, Transforms } from 'slate';
import { RenderElementProps, useFocused, useSelected } from 'slate-react';
import { styled, css } from 'styled-components';

import { prefixFileUrlWithBackendUrl } from '../../../../../../utils/urls';
import { BlocksStore, useBlocksEditorContext } from '../BlocksEditor';
import { FILE_EXTENSION_COLORS, MEDIA_SCHEMA_FIELDS } from '../utils/constants';
import { formatBytes } from '../utils/file';
import { pick } from '../utils/object';
import { Block, isFile } from '../utils/types';

const FileWrapper = styled<FlexComponent>(Flex)<{ $isFocused?: boolean }>`
  transition-property: box-shadow;
  transition-duration: 0.2s;
  ${(props) =>
    props.$isFocused &&
    css`
      box-shadow: ${props.theme.colors.primary600} 0px 0px 0px 3px;
    `}

  & > fig {
  }
  & > time {
  }
`;

const StyledTrash = styled(Trash)`
  width: 24px;
  height: 24px;

  path {
    fill: ${({ theme }) => theme.colors.danger600};
  }
`;

// TODO: is media schema fields a good decision?

const File = ({ attributes, children, element }: RenderElementProps) => {
  const editorIsFocused = useFocused();
  const fileIsSelected = useSelected();

  if (!isFile(element)) {
    return null;
  }

  const { name, url, ext, size } = element.file;

  const cleanExt = ext.substring(1);

  return (
    <Box {...attributes}>
      {children}
      <FileWrapper
        background="neutral100"
        contentEditable={false}
        justifyContent="center"
        $isFocused={editorIsFocused && fileIsSelected}
        hasRadius
      >
        <Flex
          /*         direction={{
          initial: 'column',
          medium: 'row',
        }}
        alignItems={{
          initial: 'center',
          medium: 'flex-start',
        }} */
          direction="row"
          alignItems="flex-start"
        >
          <Box
            margin={10}
            display="flex"
            alignItems="center"
            background={FILE_EXTENSION_COLORS[cleanExt]}
            data-testid="extension-box"
          >
            <Typography textColor="neutral0">{cleanExt}</Typography>
          </Box>
          <Box display="flex" flexDirection="column" alignItems="flex-start">
            <Link href={url}>
              <Typography>{name}</Typography>
            </Link>
            <Typography>{formatBytes(size)}</Typography>
          </Box>
          <Box
            // alignItems={{ initial: 'flex-end' }}
            alignItems="flex-end"
          >
            <StyledTrash />
          </Box>
        </Flex>
      </FileWrapper>
    </Box>
  );
};

const FileDialog = () => {
  const [isOpen, setIsOpen] = React.useState(true);
  const { editor } = useBlocksEditorContext('FileDialog');
  const components = useStrapiApp('FileDialog', (state) => state.components);

  if (!components || !isOpen) return null;

  const MediaLibraryDialog = components['media-library'] as React.ComponentType<{
    allowedTypes: Schema.Attribute.MediaKind[];
    onClose: () => void;
    onSelectAssets: (_files: Schema.Attribute.MediaValue<true>) => void;
  }>;

  const insertFiles = (files: Block<'file'>['file'][]) => {
    Transforms.unwrapNodes(editor, {
      match: (node) => !Editor.isEditor(node) && node.type === 'list',
      split: true,
    });

    const nodeEntryBeingReplaced = Editor.above(editor, {
      match(node) {
        if (Editor.isEditor(node)) return false;

        const isInlineNode = ['text', 'link'].includes(node.type);

        return !isInlineNode;
      },
    });

    if (!nodeEntryBeingReplaced) return;

    const [, pathToInsert] = nodeEntryBeingReplaced;

    Transforms.removeNodes(editor);

    const nodesToInsert = files.map((file) => {
      const fileNode: Block<'file'> = {
        type: 'file',
        file,
        children: [{ type: 'text', text: '' }],
      };
      return fileNode;
    });

    Transforms.insertNodes(editor, nodesToInsert, { at: pathToInsert });

    Transforms.select(editor, pathToInsert);
  };

  const handleSelectAssets = (files: Schema.Attribute.MediaValue<true>) => {
    const formattedFiles = files.map((file) => {
      const expectedFile = pick(file, MEDIA_SCHEMA_FIELDS);

      const nodeFile: Block<'file'>['file'] = {
        ...expectedFile,
        url: prefixFileUrlWithBackendUrl(file.url),
      };

      return nodeFile;
    });

    insertFiles(formattedFiles);
    setIsOpen(false);
  };

  return (
    <MediaLibraryDialog
      allowedTypes={['files']}
      onClose={() => setIsOpen(false)}
      onSelectAssets={handleSelectAssets}
    />
  );
};

const fileBlocks: Pick<BlocksStore, 'file'> = {
  file: {
    renderElement: (props) => <File {...props} />,
    icon: FileIcon,
    label: {
      id: 'components.Blocks.blocks.file', // TODO
      defaultMessage: 'File',
    },
    matchNode: (node) => node.type === 'file',
    isInBlocksSelector: true,
    handleBackspaceKey(editor) {
      if (editor.children.length === 1) {
        Transforms.setNodes(editor, {
          type: 'paragraph',
          // @ts-expect-error we're only setting file as null so that Slate deletes it
          file: null,
          children: [{ type: 'text', text: '' }],
        });
      } else {
        Transforms.removeNodes(editor);
      }
    },
    handleEnterKey(editor) {
      Transforms.insertNodes(editor, {
        type: 'paragraph',
        children: [{ type: 'text', text: '' }],
      });
    },

    handleConvert: () => {
      return () => <FileDialog />;
    },
    snippets: ['!['],
  },
};

export { fileBlocks };
