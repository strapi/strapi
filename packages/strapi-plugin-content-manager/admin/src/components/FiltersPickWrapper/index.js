/**
 *
 * FiltersPickWrapper
 */

import React from 'react';
import PropTypes from 'prop-types';
import { CSSTransition } from 'react-transition-group';

import Div from './Div';
import styles from './styles.scss';

function FiltersPickWrapper({ show }) {
  return (
    <CSSTransition
      in={show}
      unmountOnExit
      timeout={600}
      classNames={{
        enter: styles.enter,
        enterActive: styles.enterActive,
        exit: styles.exit,
        exitActive: styles.exitActive,
      }}
    >
      <Div>
        Lorem ipsum dolor sit amet, consectetur adipisicing elit. Accusantium architecto deleniti dolor doloribus enim hic illo iste non, numquam quas quod repellat reprehenderit rerum sunt, totam vel vero voluptates! Adipisci commodi distinctio eos esse, est harum impedit in quis similique, tenetur unde, vero. Atque dignissimos eaque esse ex, fuga hic id ipsam mollitia, odit officia perferendis quos ratione repudiandae sed suscipit tenetur vero voluptas voluptatibus. Asperiores blanditiis eos esse explicabo fuga illo iure libero molestias pariatur quia quibusdam quis sequi totam vel, voluptas. Aliquam beatae dolor ducimus in, laborum laudantium magnam quae quasi quia, quo, quos soluta tempora tempore totam.
        Lorem ipsum dolor sit amet, consectetur adipisicing elit. Accusantium architecto deleniti dolor doloribus enim hic illo iste non, numquam quas quod repellat reprehenderit rerum sunt, totam vel vero voluptates! Adipisci commodi distinctio eos esse, est harum impedit in quis similique, tenetur unde, vero. Atque dignissimos eaque esse ex, fuga hic id ipsam mollitia, odit officia perferendis quos ratione repudiandae sed suscipit tenetur vero voluptas voluptatibus. Asperiores blanditiis eos esse explicabo fuga illo iure libero molestias pariatur quia quibusdam quis sequi totam vel, voluptas. Aliquam beatae dolor ducimus in, laborum laudantium magnam quae quasi quia, quo, quos soluta tempora tempore totam.
        Lorem ipsum dolor sit amet, consectetur adipisicing elit. Accusantium architecto deleniti dolor doloribus enim hic illo iste non, numquam quas quod repellat reprehenderit rerum sunt, totam vel vero voluptates! Adipisci commodi distinctio eos esse, est harum impedit in quis similique, tenetur unde, vero. Atque dignissimos eaque esse ex, fuga hic id ipsam mollitia, odit officia perferendis quos ratione repudiandae sed suscipit tenetur vero voluptas voluptatibus. Asperiores blanditiis eos esse explicabo fuga illo iure libero molestias pariatur quia quibusdam quis sequi totam vel, voluptas. Aliquam beatae dolor ducimus in, laborum laudantium magnam quae quasi quia, quo, quos soluta tempora tempore totam.
        Lorem ipsum dolor sit amet, consectetur adipisicing elit. Accusantium architecto deleniti dolor doloribus enim hic illo iste non, numquam quas quod repellat reprehenderit rerum sunt, totam vel vero voluptates! Adipisci commodi distinctio eos esse, est harum impedit in quis similique, tenetur unde, vero. Atque dignissimos eaque esse ex, fuga hic id ipsam mollitia, odit officia perferendis quos ratione repudiandae sed suscipit tenetur vero voluptas voluptatibus. Asperiores blanditiis eos esse explicabo fuga illo iure libero molestias pariatur quia quibusdam quis sequi totam vel, voluptas. Aliquam beatae dolor ducimus in, laborum laudantium magnam quae quasi quia, quo, quos soluta tempora tempore totam.
      </Div>
    </CSSTransition>
  );
}


FiltersPickWrapper.propTypes = {
  show: PropTypes.bool.isRequired,
};

export default FiltersPickWrapper;
