# Templating emails

By default, this plugin comes with only one template (reset password) for the moment. More templates will come later. The templates use Lodash' template() method to populate the variables.


### Reset Password

- `USER` (object)
  - `username`
  - `email`
  - ...and every other fields that you added manually in the model.
- `TOKEN` corresponds to the token generated to be able to reset the password.
- `URL` is the link where the user will be redirected after clicking on it in the email.
