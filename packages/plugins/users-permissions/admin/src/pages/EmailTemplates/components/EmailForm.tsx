import * as React from 'react';

import { Button, Grid, Modal, Breadcrumbs, Crumb, VisuallyHidden } from '@strapi/design-system';
import { Form, InputRenderer } from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils';
import schema from '../utils/schema';

interface EmailTemplate {
  display?: string;
  icon?: string;
  options?: {
    from?: {
      name?: string;
      email?: string;
    };
    message?: string;
    object?: string;
    response_email?: string;
  };
}

interface EmailFormProps {
  template?: EmailTemplate;
  open: boolean;
  onSubmit: (values: any) => void;
  onToggle: () => void;
}

const EmailForm = ({ template = {}, onToggle, open, onSubmit }: EmailFormProps) => {
  const { formatMessage } = useIntl();

  return (
    <Modal.Root open={open} onOpenChange={onToggle}>
      <Modal.Content>
        <Modal.Header>
          <Breadcrumbs
            label={`${formatMessage({
              id: getTrad('PopUpForm.header.edit.email-templates'),
              defaultMessage: 'Edit email template',
            })}, ${
              template.display
                ? formatMessage({
                    id: getTrad(template.display),
                    defaultMessage: template.display,
                  })
                : ''
            }`}
          >
            <Crumb>
              {formatMessage({
                id: getTrad('PopUpForm.header.edit.email-templates'),
                defaultMessage: 'Edit email template',
              })}
            </Crumb>
            <Crumb isCurrent>
              {template.display
                ? formatMessage({ id: getTrad(template.display), defaultMessage: template.display })
                : ''}
            </Crumb>
          </Breadcrumbs>
          <VisuallyHidden>
            <Modal.Title>
              {`${formatMessage({
                id: getTrad('PopUpForm.header.edit.email-templates'),
                defaultMessage: 'Edit email template',
              })}, ${template.display ? formatMessage({ id: getTrad(template.display), defaultMessage: template.display }) : ''}`}
            </Modal.Title>
          </VisuallyHidden>
        </Modal.Header>
        <Form method="PUT" onSubmit={onSubmit} initialValues={template} validationSchema={schema}>
          {({ isSubmitting }: { isSubmitting: boolean }) => {
            return (
              <>
                <Modal.Body>
                  <Grid.Root gap={5}>
                    {[
                      {
                        label: formatMessage({
                          id: getTrad('PopUpForm.Email.options.from.name.label'),
                          defaultMessage: 'Shipper name',
                        }),
                        name: 'options.from.name',
                        size: 6,
                        type: 'string',
                      },
                      {
                        label: formatMessage({
                          id: getTrad('PopUpForm.Email.options.from.email.label'),
                          defaultMessage: 'Shipper email',
                        }),
                        name: 'options.from.email',
                        size: 6,
                        type: 'string',
                      },
                      {
                        label: formatMessage({
                          id: getTrad('PopUpForm.Email.options.response_email.label'),
                          defaultMessage: 'Response email',
                        }),
                        name: 'options.response_email',
                        size: 6,
                        type: 'string',
                      },
                      {
                        label: formatMessage({
                          id: getTrad('PopUpForm.Email.options.object.label'),
                          defaultMessage: 'Subject',
                        }),
                        name: 'options.object',
                        size: 6,
                        type: 'string',
                      },
                      {
                        label: formatMessage({
                          id: getTrad('PopUpForm.Email.options.message.label'),
                          defaultMessage: 'Message',
                        }),
                        name: 'options.message',
                        size: 12,
                        type: 'text',
                      },
                    ].map(({ size, ...field }) => (
                      <Grid.Item
                        key={field.name}
                        m={size}
                        xs={12}
                        direction="column"
                        alignItems="stretch"
                      >
                        <InputRenderer {...(field as any)} />
                      </Grid.Item>
                    ))}
                  </Grid.Root>
                </Modal.Body>
                <Modal.Footer>
                  <Modal.Close>
                    <Button variant="tertiary">Cancel</Button>
                  </Modal.Close>
                  <Button loading={isSubmitting} type="submit">
                    Finish
                  </Button>
                </Modal.Footer>
              </>
            );
          }}
        </Form>
      </Modal.Content>
    </Modal.Root>
  );
};

export default EmailForm;
