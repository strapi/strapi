#!/bin/sh
set -e

TEST_DIRS=""

for package in packages/*; do
  if [ -n "$TEST_ONLY" ] && [ `basename $package` != "$TEST_ONLY" ]; then
    continue
  fi

  if [ -d "$package/test" ]; then
    TEST_DIRS="$package/test $TEST_DIRS"
  fi
done

echo $TEST_DIRS
