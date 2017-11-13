// Retrieve URLs.
const remoteURL = window.location.port === '4000' ? 'http://localhost:4000/admin' : process.env.REMOTE_URL || 'http://localhost:1337/admin';
const devURL = document.getElementsByTagName('body')[0].getAttribute('front');

__webpack_public_path__ = window.location.port === '4000' ? `${window.location.origin}/` : `${(devURL || remoteURL).replace(window.location.origin, '')}/`;
