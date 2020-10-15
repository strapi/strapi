# install global packages if set
if [[ -n "$GLOBAL_PACKAGES" ]]; then
  yarn global add "$GLOBAL_PACKAGES"
  yarn global bin >>$GITHUB_PATH
fi

# run yarn
yarn
