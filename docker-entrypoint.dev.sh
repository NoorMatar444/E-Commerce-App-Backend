#!/bin/sh
set -e

# Keep container node_modules in sync when package.json changes (dev only)
npm install

exec "$@"
