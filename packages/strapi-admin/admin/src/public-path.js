// Retrieve URLs.
const remoteURL = process.env.REMOTE_URL || 'http://localhost:1337/admin';
const devURL = document.getElementsByTagName('body')[0].getAttribute('front');

__webpack_public_path__ = `${(devURL || remoteURL).replace(window.location.origin, '')}/`;
