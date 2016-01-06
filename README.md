github-keys-to-s3-lambda
========================
Lambda function used to store public keys for each team member on S3 to be
used for authentication when logging into AWS instances via SSH. Keys are
fetched from github for teams listed in TEAMS_TO_FETCH in index.js.

Note that when looking at the lambda function in the AWS console you may see a
"Process exited before completing request" error - this is because we don't call
context.succeed() at the end of the function. The function has probably completed
successfully. This should be fixed at some point.

To get access to the bucket containing the shared keys, you should submit a pull
request for bucket-policy.json, with the aws account you need access for added as
a principle for both the 'ListObject' and 'GetObject' permissions, then get Phil
or someone from the tools team to update the policy on the github-team-keys bucket.

You will also need to add your teams's name on github (see [here](https://github.com/orgs/guardian/teams)) to TEAMS_TO_FETCH in index.js to
get the lambda to start fetching keys for your team.

Deploying
---------
You'll need credentials for the composer AWS account set up. Then just run
update-lambda.sh.
