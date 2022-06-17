yarn global add lockfile-lint

lockfile-lint \
    --type $LOCKFILE_TYPE \
    --path $LOCKFILE_PATH \
    --allowed-hosts $LOCKFILE_ALLOWED_HOSTS \
    --validate-https
