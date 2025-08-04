import * as React from 'react';
import { useParams } from 'react-router-dom';

// @ts-ignore
import { Page, Layouts } from '@strapi/admin/strapi-admin';
import { Grid, Flex, Typography, JSONInput, Box } from '@strapi/design-system';

// TODO: instead of this update the handler function in the preview config file so we have access to
// the route name in the URL instead of the model UID
const modelsRouteNames = {
  'api::address.address': 'addresses',
  'api::category.category': 'categories',
  'api::condition.condition': 'conditions',
  'api::country.country': 'countries',
  'api::homepage.homepage': 'homepages',
  'api::kitchensink.kitchensink': 'kitchensink',
  'api::like.like': 'likes',
  'api::menu.menu': 'menus',
  'api::menusection.menusection': 'menusections',
  'api::relation-locale.relation-locale': 'relation-locales',
  'api::restaurant.restaurant': 'restaurants',
  'api::review.review': 'reviews',
  'api::tag.tag': 'tags',
  'api::temp.temp': 'temps',
};

const PreviewComponent = () => {
  const { uid: model, documentId, locale, status: documentStatus, collectionType } = useParams();

  const [data, setData] = React.useState(null);
  const [status, setStatus] = React.useState('idle');

  const fetchData = async () => {
    if (!documentId) return;

    setStatus('loading');

    try {
      const headers = {
        'Content-Type': 'application/json',
      };

      if (process.env.STRAPI_ADMIN_API_TOKEN) {
        headers.Authorization = `Bearer ${process.env.STRAPI_ADMIN_API_TOKEN}`;
      }

      const searchParams = new URLSearchParams({
        locale,
        status: documentStatus,
        encodeSourceMaps: 'true',
      });
      const response = await fetch(
        `http://localhost:1337/api/${modelsRouteNames[model]}/${documentId}?${searchParams.toString()}`,
        {
          headers,
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setData(result.data);
      setStatus('success');
      window.parent?.postMessage({ type: 'strapiReady' }, '*');
    } catch (error) {
      setStatus('error');
    }
  };

  const filterAttributes = (item) => {
    const excludedKeys = ['documentId', 'id', 'createdAt', 'updatedAt', 'publishedAt'];
    return Object.entries(item).filter(([key]) => !excludedKeys.includes(key));
  };

  React.useEffect(() => {
    fetchData();
  }, [documentId]);

  React.useEffect(() => {
    const handleMessage = (event) => {
      const { origin, data } = event;

      if (origin !== 'http://localhost:1337') {
        return;
      }

      if (data?.type === 'strapiUpdate') {
        // The data is stale, force a refetch
        fetchData();
      } else if (data?.type === 'strapiScript') {
        const script = window.document.createElement('script');
        script.textContent = event.data.script;
        window.document.head.appendChild(script);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  React.useEffect(() => {
    if (document) {
      window.parent?.postMessage({ type: 'strapiReady' }, '*');
    }
  }, [document]);

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={100}
      background="neutral100"
      overflow="auto"
    >
      <Layouts.Root>
        <Page.Main>
          <Page.Title>{`Previewing ${model}`}</Page.Title>
          <Layouts.Header
            title="Static Preview"
            subtitle="Dummy frontend so we can test Preview in getstarted"
            sticky={false}
          />
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
                URL metadata
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
                    <Typography>{documentStatus}</Typography>
                  </Flex>
                </Grid.Item>
                <Grid.Item col={6} s={12} direction="column" alignItems="start">
                  <Typography variant="sigma" textColor="neutral600" tag="dt">
                    Locale
                  </Typography>
                  <Typography tag="dd">{locale}</Typography>
                </Grid.Item>
              </Grid.Root>
              <Typography variant="delta" tag="h3">
                Rest API data
              </Typography>
              {status === 'loading' && <Typography>Loading data...</Typography>}
              {status === 'error' && (
                <Typography textColor="danger600">Error loading data</Typography>
              )}
              {status === 'success' && !data && (
                <Typography textColor="neutral600">No data found</Typography>
              )}
              {status === 'success' && data && (
                <>
                  <Grid.Root gap={5} tag="dl">
                    {filterAttributes(data).map(([key, value]) => (
                      <Grid.Item key={key} col={6} s={12} direction="column" alignItems="start">
                        <Typography variant="sigma" textColor="neutral600" tag="dt">
                          {key}
                        </Typography>
                        <Flex gap={3} direction="column" alignItems="start" tag="dd">
                          <Typography>
                            {typeof value === 'object' && value !== null
                              ? JSON.stringify(value, null, 2)
                              : String(value)}
                          </Typography>
                        </Flex>
                      </Grid.Item>
                    ))}
                  </Grid.Root>
                  <JSONInput value={JSON.stringify(data, null, 2)} disabled />
                </>
              )}
            </Flex>
          </Layouts.Content>
        </Page.Main>
      </Layouts.Root>
    </Box>
  );
};

export { PreviewComponent };
