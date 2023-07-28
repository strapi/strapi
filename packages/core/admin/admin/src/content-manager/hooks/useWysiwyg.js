import { useContext } from 'react';

import WysiwygContext from '../contexts/Wysiwyg';

const useWysiwyg = () => useContext(WysiwygContext);

export default useWysiwyg;
