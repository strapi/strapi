# Creating a new Field in the administration panel

In this guide we will see how you can create a new Field for your administration panel.

## Introduction

For this example, we will see how to change the WYSIWYG with [CKEditor](https://ckeditor.com/ckeditor-5/) in the **`Content Manager`** plugin by creating a new plugin which will add a new **Field** in your application.

## Setup

1. Create a new project:

```bash
# Create an application using SQLite and prevent the server from starting automatically as we will create a plugin
# right after the project generation
yarn create strapi-app my-app --quickstart --no-run
```

2. Generate a plugin:

```bash
strapi generate:plugin wysiwyg
```

3. Install the needed dependencies:

```bash
cd my-app/plugins/wysiwyg
yarn add @ckeditor/ckeditor5-react @ckeditor/ckeditor5-build-classic
```

4. Start your application with the front-end development mode:

```bash
cd my-app
yarn develop --watch-admin
```

Once this step is over all we need to do is to create our new WYSIWYG which will replace the default one in the **Content Manager** plugin.

### Creating the WYSIWYG

In this part we will create three components:

- MediaLib which will be used to insert media in the editor
- Wysiwyg which will wrap the CKEditor with a label and the errors
- CKEditor which will be the implementation of the new WYSIWYG

### Creating the MediaLib

**Path —** `./plugins/wysiwyg/admin/src/components/MediaLib/index.js`

```js
import React, { useEffect, useState } from 'react';
import { useStrapi, prefixFileUrlWithBackendUrl } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';

const MediaLib = ({ isOpen, onChange, onToggle }) => {
  const {
    strapi: {
      componentApi: { getComponent },
    },
  } = useStrapi();
  const [data, setData] = useState(null);
  const [isDisplayed, setIsDisplayed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsDisplayed(true);
    }
  }, [isOpen]);

  const Component = getComponent('media-library').Component;

  const handleInputChange = data => {
    if (data) {
      const { url } = data;

      setData({ ...data, url: prefixFileUrlWithBackendUrl(url) });
    }
  };

  const handleClosed = () => {
    if (data) {
      onChange(data);
    }

    setData(null);
    setIsDisplayed(false);
  };

  if (Component && isDisplayed) {
    return (
      <Component
        allowedTypes={['images', 'videos', 'files']}
        isOpen={isOpen}
        multiple={false}
        noNavigation
        onClosed={handleClosed}
        onInputMediaChange={handleInputChange}
        onToggle={onToggle}
      />
    );
  }

  return null;
};

MediaLib.defaultProps = {
  isOpen: false,
  onChange: () => {},
  onToggle: () => {},
};

MediaLib.propTypes = {
  isOpen: PropTypes.bool,
  onChange: PropTypes.func,
  onToggle: PropTypes.func,
};

export default MediaLib;
```

#### Creating the WYSIWYG Wrapper

**Path —** `./plugins/wysiwyg/admin/src/components/Wysiwyg/index.js`

```js
iimport React, { useState } from 'react';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';
import { Button } from '@buffetjs/core';
import { Label, InputDescription, InputErrors } from 'strapi-helper-plugin';
import Editor from '../CKEditor';
import MediaLib from '../MediaLib';

const Wysiwyg = ({
  inputDescription,
  errors,
  label,
  name,
  noErrorsDescription,
  onChange,
  value,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  let spacer = !isEmpty(inputDescription) ? <div style={{ height: '.4rem' }} /> : <div />;

  if (!noErrorsDescription && !isEmpty(errors)) {
    spacer = <div />;
  }

  const handleChange = data => {
    if (data.mime.includes('image')) {
      const imgTag = `<p><img src="${data.url}" caption="${data.caption}" alt="${data.alternativeText}"></img></p>`;
      const newValue = value ? `${value}${imgTag}` : imgTag;

      onChange({ target: { name, value: newValue } });
    }

    // Handle videos and other type of files by adding some code
  };

  const handleToggle = () => setIsOpen(prev => !prev);

  return (
    <div
      style={{
        marginBottom: '1.6rem',
        fontSize: '1.3rem',
        fontFamily: 'Lato',
      }}
    >
      <Label htmlFor={name} message={label} style={{ marginBottom: 10 }} />
      <div>
        <Button color="primary" onClick={handleToggle}>
          MediaLib
        </Button>
      </div>
      <Editor name={name} onChange={onChange} value={value} />
      <InputDescription
        message={inputDescription}
        style={!isEmpty(inputDescription) ? { marginTop: '1.4rem' } : {}}
      />
      <InputErrors errors={(!noErrorsDescription && errors) || []} name={name} />
      {spacer}
      <MediaLib onToggle={handleToggle} isOpen={isOpen} onChange={handleChange} />
    </div>
  );
};

Wysiwyg.defaultProps = {
  errors: [],
  inputDescription: null,
  label: '',
  noErrorsDescription: false,
  value: '',
};

Wysiwyg.propTypes = {
  errors: PropTypes.array,
  inputDescription: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  label: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  name: PropTypes.string.isRequired,
  noErrorsDescription: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
};

export default Wysiwyg;

```

#### Implementing CKEditor

**Path —** `./plugins/wysiwyg/admin/src/components/CKEditor/index.js`

```js
import React from 'react';
import PropTypes from 'prop-types';
import CKEditor from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import styled from 'styled-components';

const Wrapper = styled.div`
  .ck-editor__main {
    min-height: 200px;
    > div {
      min-height: 200px;
    }
  }
`;

const configuration = {
  toolbar: [
    'heading',
    '|',
    'bold',
    'italic',
    'link',
    'bulletedList',
    'numberedList',
    '|',
    'indent',
    'outdent',
    '|',
    'blockQuote',
    'insertTable',
    'mediaEmbed',
    'undo',
    'redo',
  ],
};

const Editor = ({ onChange, name, value }) => {
  return (
    <Wrapper>
      <CKEditor
        editor={ClassicEditor}
        config={configuration}
        data={value}
        onChange={(event, editor) => {
          const data = editor.getData();
          onChange({ target: { name, value: data } });
        }}
      />
    </Wrapper>
  );
};

Editor.propTypes = {
  onChange: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
};

export default Editor;
```

At this point we have simply created a new plugin which is mounted in our project but our custom **Field** has not been registered yet.

### Registering a our new Field

Since the goal of our plugin is to override the current WYSIWYG we don't want it to be displayed in the administration panel but we need it to register our new **Field**. In order to do so, we will simply modify the front-end entry point of our plugin:

**Path —** `./plugins/wysiwyg/admin/src/index.js`

```js
import pluginPkg from '../../package.json';
import Wysiwyg from './components/Wysiwyg';
import pluginId from './pluginId';

export default strapi => {
  const pluginDescription = pluginPkg.strapi.description || pluginPkg.description;

  const plugin = {
    blockerComponent: null,
    blockerComponentProps: {},
    description: pluginDescription,
    icon: pluginPkg.strapi.icon,
    id: pluginId,
    initializer: () => null,
    injectedComponents: [],
    isReady: true,
    isRequired: pluginPkg.strapi.required || false,
    leftMenuLinks: [],
    leftMenuSections: [],
    mainComponent: null,
    name: pluginPkg.strapi.name,
    preventComponentRendering: false,
    settings: null,
    trads: {},
  };

  strapi.registerField({ type: 'wysiwyg', Component: Wysiwyg });

  return strapi.registerPlugin(plugin);
};
```

And VOILA, if you create a new `collectionType` or a `singleType` with a `richtext` field you will see the implementation of [CKEditor]((https://ckeditor.com/ckeditor-5/) instead of the default WYSIWYG.
