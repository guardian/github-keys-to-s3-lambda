github-keys-to-s3-lambda
========================
Lambda function used to store public keys for each team member on S3 to be
used for authentication when logging into AWS instances via SSH. Keys are
fetched from github for teams listed in TEAMS_TO_FETCH in index.js.

To get access to the bucket containing the shared keys, you'll need someone from the
tools team to change the bucket permissions. Phil can do it, just send him your
AWS account id (which you can get from [prism](http://prism.gutools.co.uk/sources))

You will also need to add your team's name on github (see [here](https://github.com/orgs/guardian/teams)) to TEAMS_TO_FETCH in
[index.js](https://github.com/guardian/github-keys-to-s3-lambda/blob/master/index.js)
to get the lambda to start fetching keys for your team.

Deploying
---------
You'll need credentials for the composer AWS account set up. Then just run
update-lambda.sh.

Notes
-----
When looking at the lambda function in the AWS console you may see a
"Process exited before completing request" error - this is because we don't call
context.succeed() at the end of the function. The function has probably completed
successfully. This should be fixed at some point.
