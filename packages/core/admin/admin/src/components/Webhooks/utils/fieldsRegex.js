const NAME_REGEX = new RegExp('(^$)|(^[A-Za-z][_0-9A-Za-z ]*$)');
const URL_REGEX = new RegExp('(^$)|((https?://.*)(d*)/?(.*))');

export { NAME_REGEX, URL_REGEX };
