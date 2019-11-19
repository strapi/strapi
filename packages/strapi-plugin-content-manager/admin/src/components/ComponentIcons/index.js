import React from 'react';

import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';

function ComponentIcons() {
  library.add(fas);

  let fasArray = Object.keys(library.definitions.fas);

  return (
    <ul>
      {fasArray.map(fas => {
        return (
          <li key={fas}>
            <i className={`fa fa-${fas}`} />
            {fas}
          </li>
        );
      })}
    </ul>
  );
}

export default ComponentIcons;
