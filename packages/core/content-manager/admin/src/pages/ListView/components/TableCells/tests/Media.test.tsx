import { render } from '@tests/utils';
import { IntlProvider } from 'react-intl';

import { MediaSingle } from '../Media';

describe('Media cell content', () => {
  it('does not crash when media metadata is incomplete', () => {
    const { getByText } = render(
      <IntlProvider messages={{}} defaultLocale="en" textComponent="span" locale="en">
        <MediaSingle
          mime={undefined}
          url="/uploads/file.pdf"
          ext=".pdf"
          name="file.pdf"
          formats={{}}
        />
      </IntlProvider>
    );

    expect(getByText('pdf')).toBeInTheDocument();
  });
});
