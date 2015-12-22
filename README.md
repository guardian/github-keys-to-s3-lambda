github-keys-to-s3-lambda
========================
Lambda function used to store public keys for each team member on S3 to be
used for authentication when logging into AWS instances via SSH. Keys are
fetched from github for every user in a team (bots are ignored).

Note that when looking at the function in the AWS console you may see a
"Process exited before completing request" error - this is because we don't call
context.succeed() at the end of the function. The function has probably completed
succesfully. This should be fixed at some point.