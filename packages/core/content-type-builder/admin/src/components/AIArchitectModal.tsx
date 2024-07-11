import * as React from 'react';
import { useState } from 'react';

import { Form, useFetchClient, type FormProps } from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  Field,
  Flex,
  Modal,
  Table,
  Tbody,
  TextInput,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { useDataManager } from '../hooks/useDataManager';
import { useFormModalNavigation } from '../hooks/useFormModalNavigation';
import { pluginId } from '../pluginId';

import { AttributeIcon } from './AttributeIcon';
import { toAttributesArray } from './DataManagerProvider/utils/formatSchemas';

import type { Struct } from '@strapi/types';
import { DisplayedType } from './DisplayedType';

export interface AIArchitectModalProps {}

interface FormValues {
  prompt: string;
}

type OnSubmitCallback = NonNullable<FormProps<FormValues>['onSubmit']>;

export const AIArchitectModal: React.FC<AIArchitectModalProps> = () => {
  const navigate = useNavigate();
  const { post } = useFetchClient();

  const { isAIModalOpen, onOpenModalAIArchitect, onCloseModalAIArchitect } =
    useFormModalNavigation();
  const { createSchema, toggleAI } = useDataManager();

  const [prompt, setPrompt] = useState<string>('create a random collection type');
  const [schema, setSchema] = useState<any>(undefined);
  const [loading, setLoading] = useState<boolean>(false);

  const onModalChangeVisibility = (open: boolean) => {
    if (open) {
      onOpenModalAIArchitect();
    } else {
      onCloseModalAIArchitect();
    }
  };

  const onGenerate = async () => {
    setLoading(true);
    const { data } = await post(`/${pluginId}/architect`, { prompt, schema });
    setSchema(data);
    setLoading(false);
  };

  const onContinue = async () => {
    if (!schema) {
      return;
    }
    toggleAI();
    const format = (x: any) => {
      return {
        kind: x.kind,
        draftAndPublish: x.options?.draftAndPublish,
        pluginOptions: x.pluginOptions,
        ...x.info,
        attributes: toAttributesArray(x.attributes),
      };
    };

    createSchema(format(schema), 'contentType', 'api::some.some');

    navigate({ pathname: '/plugins/content-type-builder/content-types/api::some.some' });

    onCloseModalAIArchitect();
  };

  return (
    <Modal.Root open={isAIModalOpen} onOpenChange={onModalChangeVisibility}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>AI Architect</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form method="POST" onSubmit={onGenerate}>
            <Flex width="100%" gap="20px">
              <Field.Root
                name="prompt"
                hint="Example: Create a user with auth capabilities and an about me section"
                width="100%"
              >
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
              <Button type="submit" disabled={!prompt || loading}>
                Generate
              </Button>
            </Flex>
          </Form>
          {schema !== undefined && <SchemaPreview schema={schema} />}
          {/** This is where we will add the response component dynamically */}
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={onCloseModalAIArchitect} variant="danger-light">
            Cancel
          </Button>
          <Button onClick={onContinue} disabled={!schema || loading}>
            Continue
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

interface SchemaPreviewProps {
  schema: Struct.ContentTypeSchema;
}

const BoxWrapper = styled(Box)`
  position: relative;
`;

const SchemaPreview: React.FC<SchemaPreviewProps> = ({ schema }) => {
  const { info, attributes } = schema;

  const attributeCount = Object.keys(attributes).length;

  return (
    <Box marginTop="25px">
      <Box width="100%">
        <Typography variant="beta">{info.displayName}</Typography>
        <Typography variant="sigma">{info.description}</Typography>
      </Box>
      <Table colCount={2} rowCount={attributeCount} width="100%">
        <Thead>
          <Tr>
            <Th>
              <Typography variant="sigma" textColor="neutral600">
                Name
              </Typography>
            </Th>
            <Th>
              {' '}
              <Typography variant="sigma" textColor="neutral600">
                Type
              </Typography>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {Object.entries(attributes).map(([name, attribute]) => {
            return (
              <BoxWrapper tag="tr" key={name}>
                <td>
                  <Flex paddingLeft={2} gap={4}>
                    <AttributeIcon type={attribute.type} />
                    <Typography fontWeight="bold">{name}</Typography>
                  </Flex>
                </td>
                <td>
                  <DisplayedType type={attribute.type} />
                </td>
              </BoxWrapper>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
};
