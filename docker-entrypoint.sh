#!/bin/sh
set -eu
mkdir -p "${DATA_DIR:-/data}"
if [ "$(id -u)" = 0 ]; then
  # Railway mounts a root-owned volume over the image's /data directory.
  # Set only the mount root's ownership, then run the service unprivileged.
  chown node:node "${DATA_DIR:-/data}"
  chmod 700 "${DATA_DIR:-/data}"
  exec gosu node:node "$@"
fi
exec "$@"
