import * as React from 'react';
import { useParams } from 'react-router-dom';

// @ts-ignore
import { Page, Layouts } from '@strapi/admin/strapi-admin';
import { unstable_useDocument as useDocument } from '@strapi/content-manager/strapi-admin';
import { Grid, Flex, Typography, JSONInput, Box, Button, Portal } from '@strapi/design-system';
import styled from 'styled-components';

const StyledFrame = styled(Box)`
  position: relative;
  width: 100%;
  button {
    position: absolute;
    top: 0;
    transform: translateY(-100%);
    right: -2px;
    display: none;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
  &:hover {
    button {
      display: block;
    }
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary500};
  }
`;

const FieldWrapper = ({ children, path, initialValue }) => {
  const [value, setValue] = React.useState(initialValue);
  const frame = React.useRef(null);

  React.useEffect(() => {
    const handleMessage = (message) => {
      if (message.data?.type === 'strapiFieldTyping' && message.data?.payload?.field === path) {
        setValue(message.data.payload.value);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleClick = () => {
    if (window.parent && frame.current) {
      window.parent.postMessage(
        {
          type: 'willEditField',
          payload: {
            path,
            position: frame.current.getBoundingClientRect(),
          },
        },
        '*'
      );
    }
  };

  return (
    <StyledFrame ref={frame}>
      {children(value)}
      <Button onClick={handleClick} size="XS" borderRadius="0">
        Edit
      </Button>
    </StyledFrame>
  );
};

const PreviewComponent = () => {
  const { uid: model, documentId, locale, status, collectionType } = useParams();
  const { document, refetch } = useDocument({
    model,
    documentId,
    params: {
      locale,
      status,
      populate: '*',
    },
    collectionType,
  });

  React.useEffect(() => {
    const handleStrapiUpdate = (event) => {
      if (event.data?.type === 'strapiUpdate') {
        refetch();
      }
    };

    window.addEventListener('message', handleStrapiUpdate);

    return () => {
      window.removeEventListener('message', handleStrapiUpdate);
    };
  }, []);

  return (
    <Portal>
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        background="neutral100"
        zIndex={100}
      >
        <Layouts.Root>
          <Page.Main>
            <Page.Title>{`Previewing ${model}`}</Page.Title>
            <Layouts.Header title="Static Preview" subtitle="Dummy preview for getstarted app" />
            <Layouts.Content>
              <Flex
                direction="column"
                alignItems="stretch"
                gap={4}
                hasRadius
                background="neutral0"
                shadow="tableShadow"
                paddingTop={6}
                paddingBottom={6}
                paddingRight={7}
                paddingLeft={7}
              >
                <Typography variant="delta" tag="h3">
                  Details
                </Typography>

                <Grid.Root gap={5} tag="dl">
                  <Grid.Item col={6} s={12} direction="column" alignItems="start">
                    <Typography variant="sigma" textColor="neutral600" tag="dt">
                      Content Type
                    </Typography>
                    <Flex gap={3} direction="column" alignItems="start" tag="dd">
                      <Typography>{model}</Typography>
                    </Flex>
                  </Grid.Item>
                  <Grid.Item col={6} s={12} direction="column" alignItems="start">
                    <Typography variant="sigma" textColor="neutral600" tag="dt">
                      Document Id
                    </Typography>
                    <Flex gap={3} direction="column" alignItems="start" tag="dd">
                      <Typography>{documentId}</Typography>
                    </Flex>
                  </Grid.Item>
                  <Grid.Item col={6} s={12} direction="column" alignItems="start">
                    <Typography variant="sigma" textColor="neutral600" tag="dt">
                      Status
                    </Typography>
                    <Flex gap={3} direction="column" alignItems="start" tag="dd">
                      <Typography>{status}</Typography>
                    </Flex>
                  </Grid.Item>
                  <Grid.Item col={6} s={12} direction="column" alignItems="start">
                    <Typography variant="sigma" textColor="neutral600" tag="dt">
                      Locale
                    </Typography>
                    <Typography tag="dd">{locale}</Typography>
                  </Grid.Item>
                  {document && (
                    <Grid.Item col={6} s={12} direction="column" alignItems="start">
                      <Typography variant="sigma" textColor="neutral600" tag="dt">
                        City
                      </Typography>
                      <FieldWrapper path="city" initialValue={document?.city}>
                        {(value) => <Typography tag="dd">{value}</Typography>}
                      </FieldWrapper>
                    </Grid.Item>
                  )}
                </Grid.Root>
                {document && <JSONInput value={JSON.stringify(document, null, 2)} disabled />}
              </Flex>
            </Layouts.Content>
          </Page.Main>
        </Layouts.Root>
      </Box>
    </Portal>
  );
};

export { PreviewComponent };
