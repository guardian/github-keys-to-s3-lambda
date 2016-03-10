#!/usr/bin/env bash

# Bash script to inject configuration parameters from DynamoDB into a lambda script
# TODO: Rewrite script to be generic

# Usage: add_dynamo_credentials.sh [inject-variables (true/false)]

INJECT_VARIABLES=${1:-'false'}

GITHUB_OAUTH_TOKEN=$(aws dynamodb query \
    --table-name lambda-configuration \
    --region eu-west-1 \
    --profile composer \
    --key-conditions file://$PWD/lambda-config-query-key-conditions.json | \
    jq '.Items[0].GithubOAUTHToken.S')

if [ $INJECT_VARIABLES == 'true' ]
  then

echo \
'//////////////////////////////////////////////////////////////////////////////
// "Environment Variables from '${0} script'"         //
////////////////////////////////////////////////////////////////////////////
process.env["GITHUB_OAUTH_TOKEN"]='$GITHUB_OAUTH_TOKEN | cat - index.js > temp && mv temp index.js

else
  echo 'Variables should not be injected locally to prevent accidental pushing to github. To inject variables, run '${0}' true'
fi
