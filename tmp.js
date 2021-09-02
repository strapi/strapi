const axios = require('axios');

const entries = [];

for (i = 0; i < 30; i++) {
  const name = 'tota' + i;

  entries.push({
    firstname: name,
    lastname: name,
    email: name + '@s.co',
    roles: [1],
    useSSORegistration: false,
  });
}

const run = async () => {
  entries.forEach(async entry => {
    await axios.post('http://localhost:1337/admin/users', entry, {
      headers: {
        Authorization:
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNjMwNTc2Mzg3LCJleHAiOjE2MzMxNjgzODd9.oGdlhhNY8kODeLv-00INSdkke4SsM189zhtshCrlIZw',
      },
    });
  });
};

run();
