import * as React from 'react';

import { useStrapiApp } from '@strapi/admin/strapi-admin';
import {
  Button,
  Dialog,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
} from '@strapi/design-system';
import { Form, Formik } from 'formik';
import { Editor, Transforms, type Element } from 'slate';
import { type RenderElementProps } from 'slate-react';
import * as yup from 'yup';

import { useBlocksEditorContext, type BlocksStore } from '../BlocksEditor';
import { type Block } from '../utils/types';

declare global {
  interface Window {
    onYouTubePlayerAPIReady: () => void;
    YT: any;
    twttr: any;
  }
}

const schema = yup.object({
  socialMediaType: yup.mixed().oneOf(['youtube', 'x-post']),
  socialMediaUrl: yup
    .string()
    .when('socialMediaType', {
      is: 'youtube',
      then: (schema) => schema.matches(/https:\/\/www.youtube.com\/.*/, 'Use Youtube Url'),
    })
    .when('socialMediaType', {
      is: 'x-post',
      then: (schema) => schema.matches(/https:\/\/x.com\/.*/, 'Use X Url'),
    }),
});

const XMediaElement = ({ xUrl }: { xUrl: string }) => {
  function loadTweet(id: string): void {
    window.twttr.widgets
      .createTweet(id, document.getElementById('first-tweet'), {
        align: 'left',
      })
      .then(function (el: any) {});
  }

  React.useEffect(() => {
    const url = new URL(xUrl);
    const pathname = url.pathname.split('/');
    const id = pathname[pathname.length - 1];
    const isXJsLoaded = document.getElementById('twitter-wjs');
    if (!isXJsLoaded) {
      const script = document.createElement('script');

      script.id = 'twitter-wjs';
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;

      document.body.appendChild(script);
      document.getElementById('twitter-wjs')?.addEventListener('load', () => {
        loadTweet(id);
      });
    } else {
      loadTweet(id);
    }
  }, []);

  return <div id="first-tweet"></div>;
};

const YoutubeMediaElement = ({ youtubeUrl }: { youtubeUrl: string }) => {
  return (
    <iframe
      src={youtubeUrl}
      width="640"
      height="390"
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

const EmbedSocialMedia = ({ attributes, children, element }: RenderElementProps) => {
  if (!isEmbedSocialMedia(element)) {
    return null;
  }

  const { socialMediaUrl, socialMediaType } = element.embedSocialMedia;

  switch (socialMediaType) {
    case 'youtube':
      return <YoutubeMediaElement youtubeUrl={socialMediaUrl} />;
    case 'x-post':
      return <XMediaElement xUrl={socialMediaUrl} />;
    default:
      break;
  }
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
    handleConvert(editor) {
      return () => <EmbedSocialMediaDialog />;
    },
  },
};

export { embeddedSocialMediaBlocks };
