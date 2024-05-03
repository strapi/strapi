import React from 'react';

import {
  Button,
  Grid,
  GridItem,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalLayout,
} from '@strapi/design-system';
import { Breadcrumbs, Crumb } from '@strapi/design-system';
import { Form, InputRenderer } from '@strapi/strapi/admin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils';
import schema from '../utils/schema';

const EmailForm = ({ template, onToggle, onSubmit }) => {
  const { formatMessage } = useIntl();

  return (
    <ModalLayout
      onClose={onToggle}
      labelledBy={`${formatMessage({
        id: getTrad('PopUpForm.header.edit.email-templates'),
        defaultMessage: 'Edit email template',
      })}, ${formatMessage({ id: getTrad(template.display), defaultMessage: template.display })}`}
    >
      <ModalHeader>
        <Breadcrumbs
          label={`${formatMessage({
            id: getTrad('PopUpForm.header.edit.email-templates'),
            defaultMessage: 'Edit email template',
          })}, ${formatMessage({
            id: getTrad(template.display),
            defaultMessage: template.display,
          })}`}
        >
          <Crumb>
            {formatMessage({
              id: getTrad('PopUpForm.header.edit.email-templates'),
              defaultMessage: 'Edit email template',
            })}
          </Crumb>
          <Crumb isCurrent>
            {formatMessage({ id: getTrad(template.display), defaultMessage: template.display })}
          </Crumb>
        </Breadcrumbs>
      </ModalHeader>
      <Form onSubmit={onSubmit} initialValues={template} validationSchema={schema}>
        {({ isSubmitting }) => {
          return (
            <>
              <ModalBody>
                <Grid gap={5}>
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
                    <GridItem key={field.name} col={size}>
                      <InputRenderer {...field} />
                    </GridItem>
                  ))}
                </Grid>
              </ModalBody>
              <ModalFooter
                startActions={
                  <Button onClick={onToggle} variant="tertiary">
                    Cancel
                  </Button>
                }
                endActions={
                  <Button loading={isSubmitting} type="submit">
                    Finish
                  </Button>
                }
              />
            </>
          );
        }}
      </Form>
    </ModalLayout>
  );
};

EmailForm.propTypes = {
  template: PropTypes.shape({
    display: PropTypes.string,
    icon: PropTypes.string,
    options: PropTypes.shape({
      from: PropTypes.shape({
        name: PropTypes.string,
        email: PropTypes.string,
      }),
      message: PropTypes.string,
      object: PropTypes.string,
      response_email: PropTypes.string,
    }),
  }).isRequired,
  onSubmit: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default EmailForm;
