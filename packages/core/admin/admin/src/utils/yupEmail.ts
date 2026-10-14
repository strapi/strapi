import * as yup from 'yup';

/**
 * The browser bundle uses stock yup 0.32.9, whose email regex backtracks exponentially on some
 * short inputs and can freeze the tab: a stored draft email is validated again when another admin
 * opens Bulk Publish or a release. This is the server's linear pattern from `@strapi/utils`
 * (`EMAIL_REGEX`); a test checks the two stay identical.
 */
export const EMAIL_REGEX =
  // eslint-disable-next-line no-useless-escape, no-control-regex
  /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i;

// Stock yup reads the default message from its locale each time `.email()` is called, so
// `yup.setLocale({ string: { email } })` takes effect. Building a schema with yup's own method and
// reading the message it stored keeps that behaviour, without running any input through the old
// regex.
const yupEmail = yup.StringSchema.prototype.email;

const defaultEmailMessage = () => {
  const { tests } = yupEmail.call(yup.string());
  return tests[tests.length - 1].OPTIONS.message;
};

/**
 * Applied when the admin entry loads, before any plugin builds a schema, so every `.email()` in
 * the admin panel uses the linear pattern.
 */
yup.addMethod(
  yup.string,
  'email',
  function email(message: Parameters<yup.StringSchema['email']>[0] = defaultEmailMessage()) {
    return this.matches(EMAIL_REGEX, { name: 'email', message, excludeEmptyString: true });
  }
);
