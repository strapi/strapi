yarn dlx lockfile-lint \
    --type $LOCKFILE_TYPE \
    --path $LOCKFILE_PATH \
    --allowed-hosts $LOCKFILE_ALLOWED_HOSTS \
    --allowed-schemes "npm:" "workspace:" "patch:"
