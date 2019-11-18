import React from 'react';

import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';

function ComponentIcons() {
  // Get the entire set of icons
  library.add(fas);
  let fasArray = Object.keys(library.definitions.fas);

  return (
    <ul>
      {fasArray.map(fas => {
        return (
          <li key={fas}>
            <i>{fas}</i>
          </li>
        );
      })}
    </ul>
  );
}

export default ComponentIcons;
