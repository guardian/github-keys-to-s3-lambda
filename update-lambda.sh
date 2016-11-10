#!/usr/bin/env bash

set -e

cp index.js index1.js
zip -r -q keysToS3Lambda.zip index.js node_modules/ package.json
rm index.js
mv index1.js index.js
aws s3 cp keysToS3Lambda.zip s3://deploy-tools-dist/deploy/PROD/keys-to-S3/keysToS3Lambda.zip --profile deployTools
aws lambda update-function-code --function-name github-keys-to-s3 --s3-bucket deploy-tools-dist --s3-key deploy/PROD/keys-to-S3/keysToS3Lambda.zip --profile deployTools --region eu-west-1
rm keysToS3Lambda.zip
