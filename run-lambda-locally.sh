#!/usr/bin/env bash

set -e

export KEYS_TO_S3_RUN_LOCAL=true
cp index.js index1.js
node index.js
rm index.js
mv index1.js index.js
