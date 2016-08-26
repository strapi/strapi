# Remote testing

```Shell
npm run start:tunnel
```

This command will start a server and tunnel it with `ngrok`. You'll get a URL
that looks a bit like this: `http://abcdef.ngrok.com`

This URL will show the version of your application that's in the `build` folder,
and it's accessible from the entire world! This is great for testing on different
devices and from different locations!
