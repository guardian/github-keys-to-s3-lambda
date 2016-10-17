#!/usr/bin/env bash

set -e

cp index.js index1.js
zip -r -q keysToS3Lambda.zip index.js node_modules/ package.json
rm index.js
mv index1.js index.js
aws s3 cp keysToS3Lambda.zip s3://lambda-dist-cross-stream/keys-to-s3/keysToS3Lambda.zip --profile composer
aws lambda update-function-code --function-name keys-to-s3-lambda-KeysToS3Lambda-1LDJ9H96DQ5OA --s3-bucket lambda-dist-cross-stream --s3-key keys-to-s3/keysToS3Lambda.zip --profile composer
rm keysToS3Lambda.zip
