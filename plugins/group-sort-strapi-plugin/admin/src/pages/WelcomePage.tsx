import { Flex, Main, StrapiTheme, TypographyComponent } from '@strapi/design-system';
import { Typography } from '@strapi/design-system';
import { FormattedMessage } from 'react-intl';
import { useTranslation } from '../hooks/useTranslation';

import styled from 'styled-components';

import { LeftMenu } from '../components/LeftMenu';
import { GridFour } from '@strapi/icons';
import { Layouts, Page } from '@strapi/strapi/admin';

const MainBox = styled.div`
  margin: ${({ theme }) => (theme as StrapiTheme).spaces[4]};
  padding: ${({ theme }) => (theme as StrapiTheme).spaces[6]};
  background-color: ${({ theme }) => (theme as StrapiTheme).colors.neutral0};

  li {
    margin-left: ${({ theme }) => (theme as StrapiTheme).spaces[6]};
  }
`;
const WordWrap = styled<TypographyComponent>(Typography)`
  word-break: break-word;
  p, ol {
    margin-bottom: ${({ theme }) => (theme as StrapiTheme).spaces[2]};
  }
  li {
    list-style-type: number;
  }
`;
const GridFourCustom = styled(GridFour)`
  margin-right: ${({ theme }) => (theme as StrapiTheme).spaces[2]};
  width: ${({ theme }) => (theme as StrapiTheme).spaces[6]};
  height: ${({ theme }) => (theme as StrapiTheme).spaces[6]};
`;

// TODO: "plugin.instructions" is not put to translations

/**
 * WelcomePage component, used as the main page of the plugin
 */
const WelcomePage = () => {
  const { formatMessage } = useTranslation();

  return (
    <Layouts.Root sideNav={<LeftMenu />}>
      <Page.Title>
        {formatMessage({
          id: 'plugin.name',
          defaultMessage: 'Group and Arrange',
        })}
      </Page.Title>
      <Main>
        <MainBox>
          <Flex direction="column" alignItems="flex-start" gap={5}>
            <Typography variant="alpha">
              <GridFourCustom />
              {formatMessage({
                id: 'plugin.name',
                defaultMessage: 'Group and Arrange',
              })}
            </Typography>
            <WordWrap>
              <FormattedMessage
                id="plugin.description"
                defaultMessage="This plugin allows you to group and arrange content types in the Strapi admin panel. Choose a collection and group in the panel to the left to get started!"
              />
            </WordWrap>
            <WordWrap>
              <FormattedMessage
                id="plugin.instructions"
                defaultMessage="
                <p>To use the Group and Arrange plugin, follow these steps:</p>
                <ol>
                  <li>
                    Create column in content type manager of one of following types:
                    <ul>
                      <li>Order - simple drag-and-drop ordering of 1-dimensional list</li>
                      <li>Order 2D - tile-based arrangement of tiles on 2d grid, items can be resized as well (drag bottom right corner)</li>
                      <li>Multiline order - multiple lines with variable amount of elements in lines</li>
                    </ul>
                  </li>
                  <li>Set column to group by in 'Advanced settings' tab. Can group by multiple type of columns - numbers, texts, media, relations etc.</li>
                  <li>Set required additional settings, such as columns count</li>
                  <li>Open oplugin page and in left menu select the collection type and group you want to arrange items in</li>
                  <li>Use the drag-and-drop interface to arrange your content types</li>
                  <li>Change settings on page to change current view (values only affect current user and saved in browser's localStorage)</li>
                  <li>Don't forget to click <b>Save</b> to apply your changes.</li>
                </ol>
                <p>For more detailed instructions, refer to the plugin documentation.</p>
                "
                values={{
                  b: (chunks: any) => <strong>{chunks}</strong>,
                  i: (chunks: any) => <em>{chunks}</em>,
                  u: (chunks: any) => <u>{chunks}</u>,
                  p: (chunks: any) => <p>{chunks}</p>,
                  br: () => <br />,
                  ul: (chunks: any) => <ul>{chunks}</ul>,
                  ol: (chunks: any) => <ol>{chunks}</ol>,
                  li: (chunks: any) => <li>{chunks}</li>,
                  code: (chunks: any) => <code>{chunks}</code>,
                  pre: (chunks: any) => <pre>{chunks}</pre>,
                }}
              />
            </WordWrap>
          </Flex>
        </MainBox>
      </Main>
    </Layouts.Root>
  );
};

export { WelcomePage };
