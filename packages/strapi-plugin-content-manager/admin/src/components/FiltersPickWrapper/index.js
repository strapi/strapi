/**
 *
 * FiltersPickWrapper
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

// You can find these components in either
// ./node_modules/strapi-helper-plugin/lib/src
// or strapi/packages/strapi-helper-plugin/lib/src
import PluginHeader from 'components/PluginHeader';
import SlideDown from 'components/SlideDown/Loadable';

import Div from './Div';

const spanStyle = {
  color: '#787E8F',
  fontSize: '20px',
  fontWeight: '500',
};

function FiltersPickWrapper({ actions, modelName, show }) {
  const title = () => (
    <FormattedMessage id="content-manager.components.FiltersPickWrapper.PluginHeader.title.filter">
      {message => (
        <span>
          {modelName}&nbsp;-&nbsp;
          <span style={spanStyle}>
            {message}
          </span>
        </span>
      )}
    </FormattedMessage>
  );

  return (
    <SlideDown on={show}>
      <Div>
        <div>
          <PluginHeader
            actions={actions}
            description={{
              id: 'content-manager.components.FiltersPickWrapper.PluginHeader.description',
            }}
            title={title}
          />
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Accusantium architecto deleniti
          dolor doloribus enim hic illo iste non, numquam quas quod repellat reprehenderit rerum
          sunt, totam vel vero voluptates! Adipisci commodi distinctio eos esse, est harum impedit
          in quis similique, tenetur unde, vero. Atque dignissimos eaque esse ex, fuga hic id ipsam
          mollitia, odit officia perferendis quos ratione repudiandae sed suscipit tenetur vero
          voluptas voluptatibus. Asperiores blanditiis eos esse explicabo fuga illo iure libero
          molestias pariatur quia quibusdam quis sequi totam vel, voluptas. Aliquam beatae dolor
          ducimus in, laborum laudantium magnam quae quasi quia, quo, quos soluta tempora tempore
          totam. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Accusantium architecto
          deleniti dolor doloribus enim hic illo iste non, numquam quas quod repellat reprehenderit
          rerum sunt, totam vel vero voluptates! Adipisci commodi distinctio eos esse, est harum
          impedit in quis similique, tenetur unde, vero. Atque dignissimos eaque esse ex, fuga hic
          id ipsam mollitia, odit officia perferendis quos ratione repudiandae sed suscipit tenetur
          vero voluptas voluptatibus. Asperiores blanditiis eos esse explicabo fuga illo iure libero
          molestias pariatur quia quibusdam quis sequi totam vel, voluptas. Aliquam beatae dolor
          ducimus in, laborum laudantium magnam quae quasi quia, quo, quos soluta tempora tempore
          totam. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Accusantium architecto
          deleniti dolor doloribus enim hic illo iste non, numquam quas quod repellat reprehenderit
          rerum sunt, totam vel vero voluptates! Adipisci commodi distinctio eos esse, est harum
          impedit in quis similique, tenetur unde, vero. Atque dignissimos eaque esse ex, fuga hic
          id ipsam mollitia, odit officia perferendis quos ratione repudiandae sed suscipit tenetur
          vero voluptas voluptatibus. Asperiores blanditiis eos esse explicabo fuga illo iure libero
          molestias pariatur quia quibusdam quis sequi totam vel, voluptas. Aliquam beatae dolor
          ducimus in, laborum laudantium magnam quae quasi quia, quo, quos soluta tempora tempore
          totam. Lorem ipsum dolor sit amet, consectetur adipisicing elit. Accusantium architecto
          deleniti dolor doloribus enim hic illo iste non, numquam quas quod repellat reprehenderit
          rerum sunt, totam vel vero voluptates! Adipisci commodi distinctio eos esse, est harum
          impedit in quis similique, tenetur unde, vero. Atque dignissimos eaque esse ex, fuga hic
          id ipsam mollitia, odit officia perferendis quos ratione repudiandae sed suscipit tenetur
          vero voluptas voluptatibus. Asperiores blanditiis eos esse explicabo fuga illo iure libero
          molestias pariatur quia quibusdam quis sequi totam vel, voluptas. Aliquam beatae dolor
          ducimus in,
          laborum laudantium magnam quae quasi quia, quo, quos soluta tempora tempore
          totam.
        </div>
      </Div>
    </SlideDown>
  );
}

FiltersPickWrapper.defaultProps = {
  actions: [],
  modelName: '',
};

FiltersPickWrapper.propTypes = {
  actions: PropTypes.array,
  modelName: PropTypes.string,
  show: PropTypes.bool.isRequired,
};

export default FiltersPickWrapper;
