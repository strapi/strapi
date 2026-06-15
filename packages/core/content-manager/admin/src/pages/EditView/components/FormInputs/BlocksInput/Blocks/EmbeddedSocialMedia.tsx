import * as React from 'react';

import { useStrapiApp } from '@strapi/admin/strapi-admin';
import {
  Button,
  Dialog,
  Field,
  Box,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  FlexComponent,
} from '@strapi/design-system';
import { Form, Formik } from 'formik';
import { Editor, Transforms, type Element } from 'slate';
import { useFocused, type RenderElementProps, useSelected } from 'slate-react';
import { styled, css } from 'styled-components';
import * as yup from 'yup';

import { useBlocksEditorContext, type BlocksStore } from '../BlocksEditor';
import { type Block } from '../utils/types';

const schema = yup.object({
  socialMediaType: yup.mixed().oneOf(['youtube', 'x-post']).required(),
  socialMediaUrl: yup
    .string()
    .when('socialMediaType', {
      is: 'youtube',
      then: (schema) => schema.matches(/https:\/\/www.youtube.com\/.*/, 'Use Youtube Url'),
    })
    .when('socialMediaType', {
      is: 'x-post',
      then: (schema) => schema.matches(/https:\/\/x.com\/.*\/status\/\d{19}/, 'Use X Url'),
    })
    .required(),
});

const EmbeddedSocialMediaWrapper = styled<FlexComponent>(Flex)<{ $isFocused?: boolean }>`
  transition-property: box-shadow;
  transition-duration: 0.2s;
  ${(props) =>
    props.$isFocused &&
    css`
      box-shadow: ${props.theme.colors.primary600} 0px 0px 0px 3px;
    `}

  &> iframe {
    height: auto;
    min-height: 390px;
    max-width: 100%;
    object-fit: contain;
  }
`;

const XMediaElement = ({ xUrl }: { xUrl: string }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  function loadTweet(id: string): void {
    const container = containerRef.current;
    if (!container || container.querySelector('iframe')) return;
    window.twttr.ready(() => {
      window.twttr.widgets
        .createTweet(id, container, {
          align: 'left',
          width: '470',
        })
        .then(function (el: any) {})
        .catch(() => {
          console.error('Unable to load tweet');
        });
    });
  }

  React.useEffect(() => {
    // extract the Tweet ID from URL
    const url = new URL(xUrl);
    const pathname = url.pathname.split('/');
    const id = pathname[pathname.length - 1];
    const isXJsLoaded = document.getElementById('twitter-wjs');
    if (!isXJsLoaded) {
      // check if twitter's/X's widgets.js exists if not then add it and as soon as it loads load the tweet
      const script = document.createElement('script');
      script.id = 'twitter-wjs';
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.onload = () => loadTweet(id);
      document.body.appendChild(script);
    } else if (!window.twttr?.widgets) {
      // wait for widgets.js to load before loading the tweet
      document.getElementById('twitter-wjs')?.addEventListener('load', () => {
        loadTweet(id);
      });
    } else {
      loadTweet(id);
    }
  }, []);

  return <div ref={containerRef} style={{ minWidth: 470, width: 'auto' }}></div>;
};

const YoutubeMediaElement = ({ youtubeUrl }: { youtubeUrl: string }) => {
  return (
    <iframe
      src={youtubeUrl}
      title="Youtube Video"
      width="640"
      height="390"
      style={{ aspectRatio: '16/ 9' }}
      referrerPolicy="strict-origin-when-cross-origin"
    ></iframe>
  );
};

const EmbedSocialMediaDialog = () => {
  // Copy Pasta from embedding Dialog
  const [isOpen, setIsOpen] = React.useState(true);
  const { editor } = useBlocksEditorContext('EmbedSocialMediaDialog');
  const components = useStrapiApp('EmbedSocialMediaDialog', (state) => state.components);

  if (!components || !isOpen) return null;

  const insertEmbedSocialMedia = (
    socialMediaUrl: string,
    socialMediaType: 'youtube' | 'x-post'
  ) => {
    // If the selection is inside a list, split the list so that the modified block is outside of it
    Transforms.unwrapNodes(editor, {
      match: (node) => !Editor.isEditor(node) && node.type === 'list',
      split: true,
    });

    // Save the path of the node that is being replaced by an embedding to insert the embedding there later
    // It's the closest full block node above the selection
    const nodeEntryBeingReplaced = Editor.above(editor, {
      match(node) {
        if (Editor.isEditor(node)) return false;

        const isInlineNode = ['text', 'link'].includes(node.type);

        return !isInlineNode;
      },
    });

    if (!nodeEntryBeingReplaced) return;
    const [, pathToInsert] = nodeEntryBeingReplaced;

    // Remove the previous node that is being replaced by an embedding
    Transforms.removeNodes(editor);

    // Convert embedding to nodes and insert them
    const embedSocialMediaNode: Block<'embedded-social-media'> = {
      type: 'embedded-social-media',
      embedSocialMedia: {
        socialMediaUrl,
        socialMediaType,
      },
      children: [{ type: 'text', text: '' }],
    };

    Transforms.insertNodes(editor, embedSocialMediaNode, { at: pathToInsert });

    // Set the selection on the embedding since it was cleared by calling removeNodes
    Transforms.select(editor, pathToInsert);
  };

  const handleOnSubmit = async ({
    socialMediaType,
    socialMediaUrl,
  }: {
    socialMediaType: 'youtube' | 'x-post';
    socialMediaUrl: string;
  }) => {
    if (socialMediaType == 'youtube') {
      const youtubeUrl = new URL(socialMediaUrl);
      const videoId = youtubeUrl.searchParams.get('v');
      socialMediaUrl = 'https://www.youtube.com/embed/' + videoId;
    }
    insertEmbedSocialMedia(socialMediaUrl, socialMediaType);
    setIsOpen(false);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Content>
        <Formik
          onSubmit={handleOnSubmit}
          validationSchema={schema}
          initialValues={{ socialMediaType: 'youtube', socialMediaUrl: '' }}
        >
          {({ values, errors, handleChange, handleBlur, setFieldValue }) => (
            <Form>
              <Dialog.Header>Select Media to Embed</Dialog.Header>
              <Dialog.Body>
                <Flex
                  width="100%"
                  alignItems="start"
                  direction="column"
                  gap={4}
                  paddingLeft={3}
                  paddingRight={3}
                >
                  <Field.Root>
                    <SingleSelect
                      name="socialMediaType"
                      value={values.socialMediaType}
                      onChange={(value) => {
                        setFieldValue('socialMediaType', value);
                      }}
                    >
                      <SingleSelectOption value={'youtube'}>Youtube</SingleSelectOption>
                      <SingleSelectOption value={'x-post'}>X Post</SingleSelectOption>
                    </SingleSelect>
                  </Field.Root>
                  <Field.Root width="100%" error={errors.socialMediaUrl}>
                    <Field.Label>Social Media Url</Field.Label>
                    <TextInput
                      name="socialMediaUrl"
                      type="text"
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={values.socialMediaUrl}
                    />
                  </Field.Root>
                </Flex>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.Cancel>
                  <Button>Cancel</Button>
                </Dialog.Cancel>
                <Button type="submit">Save</Button>
              </Dialog.Footer>
            </Form>
          )}
        </Formik>
      </Dialog.Content>
    </Dialog.Root>
  );
};

const isEmbedSocialMedia = (element: Element): element is Block<'embedded-social-media'> => {
  return element.type === 'embedded-social-media';
};

const SocialMedia = ({
  socialMediaUrl,
  socialMediaType,
}: {
  socialMediaUrl: string;
  socialMediaType: 'youtube' | 'x-post';
}) => {
  switch (socialMediaType) {
    case 'youtube':
      return <YoutubeMediaElement youtubeUrl={socialMediaUrl} />;
    case 'x-post':
      return <XMediaElement xUrl={socialMediaUrl} />;
    default:
      break;
  }
};

const EmbedSocialMedia = ({ attributes, children, element }: RenderElementProps) => {
  const editorIsFocused = useFocused();
  const imageIsSelected = useSelected();

  if (!isEmbedSocialMedia(element)) {
    return null;
  }

  const { socialMediaUrl, socialMediaType } = element.embedSocialMedia;

  return (
    <Box {...attributes}>
      {children}
      <EmbeddedSocialMediaWrapper
        background="neutral100"
        contentEditable={false}
        justifyContent="center"
        $isFocused={editorIsFocused && imageIsSelected}
        hasRadius
      >
        <SocialMedia socialMediaUrl={socialMediaUrl} socialMediaType={socialMediaType} />
      </EmbeddedSocialMediaWrapper>
    </Box>
  );
};

const withEmbedSocialMedia = (editor: Editor) => {
  const { isVoid } = editor;

  editor.isVoid = (element) => {
    return element.type === 'embedded-social-media' ? true : isVoid(element);
  };

  return editor;
};

const embeddedSocialMediaBlocks: Pick<BlocksStore, 'embedded-social-media'> = {
  'embedded-social-media': {
    renderElement: (props) => <EmbedSocialMedia {...props} />,
    icon: () => (
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M4.825 12.025L8.7 15.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-4.6-4.6q-.15-.15-.213-.325T2.426 12t.063-.375t.212-.325l4.6-4.6q.3-.3.713-.3t.712.3t.3.713t-.3.712zm14.35-.05L15.3 8.1q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.6 4.6q.15.15.213.325t.062.375t-.062.375t-.213.325l-4.6 4.6q-.3.3-.7.288t-.7-.313t-.3-.712t.3-.713z"
        />
      </svg>
    ),
    label: {
      id: 'components.Blocks.blocks.embedded-social-media',
      defaultMessage: 'Embed Social Media',
    },
    matchNode: (node) => node.type === 'embedded-social-media',
    isInBlocksSelector: true,
    dragHandleTopMargin: '-2px',
    handleEnterKey(editor) {
      Transforms.insertNodes(editor, {
        type: 'paragraph',
        children: [{ type: 'text', text: '' }],
      });
    },
    handleConvert(editor) {
      return () => <EmbedSocialMediaDialog />;
    },
    snippets: ['!['],
    plugin: withEmbedSocialMedia,
  },
};

export { embeddedSocialMediaBlocks };
