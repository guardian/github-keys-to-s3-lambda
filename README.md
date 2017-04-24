github-keys-to-s3-lambda
========================
Lambda function used to store public keys for each team member on S3 to be
used for authentication when logging into AWS instances via SSH. Keys are
fetched from github for teams listed in TEAMS_TO_FETCH in index.js.

You will need to submit a pull request to add your team's name on github (see 
[here](https://github.com/orgs/guardian/teams)) to TEAMS_TO_FETCH in
[index.js](https://github.com/guardian/github-keys-to-s3-lambda/blob/master/index.js)
to get the lambda to start fetching keys for your team.

This lambda is designed to be used with the [ssh-keys role in amigo](https://amigo.gutools.co.uk/roles#s3-ssh-keys).

Deployment
-----

1. (Suggested) switch to the version of node used by the lambda (currently 4.3)
2. `npm install`
3. `./update-lambda.sh` (requires deploy tools account credentials)

Notes
-----
There is a legacy version of this lambda running in the composer AWS account, pusing to a bucket called github-team-keys in the same account. When everyone has switched over their setup to use the new bucket we can kill it. 

When looking at the lambda function in the AWS console you may see a
"Process exited before completing request" error - this is because we don't call
context.succeed() at the end of the function. The function has probably completed
successfully. This should be fixed at some point.
