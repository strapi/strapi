import * as React from 'react';
import { useState } from 'react';

import { Form, type FormProps } from '@strapi/admin/strapi-admin';
import { Button, Field, Flex, Modal, TextInput } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

import { useDataManager } from '../hooks/useDataManager';
import { useFormModalNavigation } from '../hooks/useFormModalNavigation';

import type { Struct } from '@strapi/types';
import { RESET_PROPS } from './FormModal/constants';

export interface AIArchitectModalProps {}

interface FormValues {
  prompt: string;
}

type OnSubmitCallback = NonNullable<FormProps<FormValues>['onSubmit']>;

export const AIArchitectModal: React.FC<AIArchitectModalProps> = () => {
  const dispatch = useDispatch();

  const { isAIModalOpen, onOpenModalAIArchitect, onCloseModalAIArchitect } =
    useFormModalNavigation();
  const { createSchema, setModifiedData } = useDataManager();

  const [prompt, setPrompt] = useState<string>();

  const onModalChangeVisibility = (open: boolean) => {
    if (open) {
      onOpenModalAIArchitect();
    } else {
      onCloseModalAIArchitect();
    }
  };

  const onSubmit: OnSubmitCallback = (values, helpers) => {
    alert(`Prompt: "${prompt}"`);

    // we can update the DataManager Provider state with this
    // Not 100% sure how the admin view will react to that
    createSchema(
      {
        draftAndPublish: true,
        pluginOptions: {
          i18n: {
            localized: false,
          },
        },
        displayName: 'SOME',
        singularName: 'some',
        pluralName: 'somes',
        kind: 'collectionType',
      },
      'contentType',
      'api::some.some'
    );

    setModifiedData();
  };

  return (
    <Modal.Root open={isAIModalOpen} onOpenChange={onModalChangeVisibility}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>AI Architect</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form method="POST" onSubmit={onSubmit}>
            <Flex width="100%" gap="20px">
              <Field.Root name="prompt" width="100%">
                <TextInput
                  type="text"
                  placeholder="What do you want to create?"
                  name="prompt"
                  value={prompt}
                  onChange={(e) => {
                    e.preventDefault();
                    setPrompt(e.target.value);
                  }}
                />
                <Field.Hint />
              </Field.Root>
              <Button type="submit">Generate</Button>
            </Flex>
          </Form>
          {/** This is where we will add the response component dynamically */}
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
};

// {
//   "uid": "api::some.some",
//   "isTemporary": true,
//   "schema": {
//       "draftAndPublish": true,
//       "pluginOptions": {
//           "i18n": {
//               "localized": false
//           }
//       },
//       "displayName": "some",
//       "singularName": "some",
//       "pluralName": "somes",
//       "kind": "collectionType",
//       "attributes": []
//   }
// }
