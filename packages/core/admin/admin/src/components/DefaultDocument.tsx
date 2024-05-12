import { NoJavascript } from './NoJavascript';

/**
 * TODO: add favicons.........
 */

const globalStyles = `
  html,
  body,
  #strapi {
    height: 100%;
  }
  body {
    margin: 0;
    -webkit-font-smoothing: antialiased;
  }
`;

interface DefaultDocumentProps {
  entryPath?: string;
}

/**
 * @internal
 */
const DefaultDocument = ({ entryPath }: DefaultDocumentProps) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="robots" content="noindex" />
        <meta name="referrer" content="same-origin" />

        <title>Strapi Admin</title>
        <style>{globalStyles}</style>
      </head>
      <body>
        <div id="strapi" />
        <NoJavascript />
        {entryPath ? <script type="module" src={entryPath} /> : null}
      </body>
    </html>
  );
};

export { DefaultDocument };
