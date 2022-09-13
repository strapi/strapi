import { useEffect } from 'react';

const useFocusWhenNavigate = (selector = 'main', dependencies = []) => {
  useEffect(() => {
    const mainElement = document.querySelector(selector);

    if (mainElement) {
      mainElement.focus();
      window.scrollTo({ top: 0 });
    } else {
      console.warn(
        `[useFocusWhenNavigate] The page does not contain the selector "${selector}" and can't be focused.`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
};

export default useFocusWhenNavigate;
