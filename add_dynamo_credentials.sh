GITHUB_OAUTH_TOKEN=$(aws dynamodb query \
    --table-name lambda-configuration \
    --key-conditions file://$PWD/lambda-config-query-key-conditions.json | \
    jq '.Items[0].GithubOAUTHToken.S')

echo \
'//////////////////////////////////////////////////////////////////////////////
// "Environment Variables from '${0} script'"         //
////////////////////////////////////////////////////////////////////////////
process.env["GITHUB_OAUTH_TOKEN"]='$GITHUB_OAUTH_TOKEN'\n' | cat - index.js > temp && mv temp index.js
