//exports.handler contains the logic to be executed when the lambda function is run.

var rp = require('request-promise');
var Promise = require('promise');
var AWS = require('aws-sdk');

AWS.config.update({
  region: "eu-west-1"
});

var dynamoClient = new AWS.DynamoDB.DocumentClient()

// add your github team name here to add your team's keys to the bucket
// (see https://github.com/orgs/guardian/teams)
var TEAMS_TO_FETCH = ['Digital CMS', 'OpsManager-SSHAccess', 'Editorial Tools SSHAccess', 'Guardian Frontend', 'Discussion', 'Data Technology', 'Teamcity', 'Deploy Infrastructure', 'Membership and Subscriptions', 'Domains platform', 'Commercial dev', 'Content Platforms', 'Multimedia']

function configFromDynamo(functionName) {
  var params = {
    TableName: functionName + "-config"
  }
  return new Promise(function (fulfill, reject) {
    dynamoClient.scan(params, function(err, data) {
      if (err) reject(err)
      else fulfill(data);
    });
  }).then(function (res) {
    console.log(res.Items);
    var config = {};
    res.Items.forEach(function(row) {
      config[row.key] = row.value
    });
    return config;
  });
}

function githubApiRequest(path, githubOAuthToken, page) {
  return rp({
    uri: 'https://api.github.com' + path,
    headers: {
      'Authorization': 'token ' + githubOAuthToken,
      'User-Agent': 'nodey'
    },
    qs: {
        per_page: 100,
        page: page
    },
    json: true
  }).catch(function(err) {
    console.error(err);
  });
}

function pagedGithubApiRequest(path, githubOAuthToken, page, teamList) {
    if (teamList) {
        return githubApiRequest(path, githubOAuthToken, page).then(function(resp) {
            if (resp.length === 0) return teamList;
            else return pagedGithubApiRequest(path, githubOAuthToken, page+1, teamList.concat(resp));
            })
    } else {
        return githubApiRequest(path, githubOAuthToken, page).then(function(resp){
            return pagedGithubApiRequest(path, githubOAuthToken, page+1, resp)
        })
    }
}

function membersListToLogin(membersList) {
  return membersList.map(function (member) {
    return member.login;
  })
}

function getGithubBots(githubOAuthToken) {
  return githubApiRequest('/teams/748826/members', githubOAuthToken).then(function (botsTeam) {
    return botsTeam.map(function(member) {
      return member.login;
    });
  });
}

function removeBots(usernameList, botList) {
  return usernameList.filter(function (name){ return botList.indexOf(name) < 0})
}

function usernameListToKeysList(usernameList, githubOAuthToken) {
  return Promise.all(usernameList.map(function (username) {
    return githubApiRequest('/users/' + username + '/keys', githubOAuthToken).then(function(keyResult) {
      if (keyResult[0]) {
        return keyResult.map(function(key) {
          return key.key + ' ' + username;
        }).join('\n');
      } else {
        console.log("No key for user " + username);
        return "";
      }
    });
  })).then(function(unl) {
    return unl.join('\n');
  });
}

function teamToTeamKeysObject(team, botList, githubOAuthToken) {
  return {
    teamName: team.name,
    teamMembers: githubApiRequest('/teams/' + team.id + '/members', githubOAuthToken)
    .then(membersListToLogin)
    .then(function(logins) { return removeBots(logins, botList);})
    .then(function(usernames) { return usernameListToKeysList(usernames, githubOAuthToken);})
  }
}

function cleanTeamName(name) {
  return name.replace(/ /g, '-');
}

function postToS3(bucket, teamName, body) {
  var s3 = new AWS.S3();
  var key = cleanTeamName(teamName) + '/authorized_keys';
  var params = {Bucket: bucket, Key: key, Body: body};

  s3.putObject(params, function(err, data) {
    if (err) {
      console.error(err);
    } else {
      console.log("Successfully uploaded data to github-team-keys/" + key);
    }
  });
}

// remove teams from the bucket that aren't needed
function filterTeamList(teamList) {
  return teamList.filter(function(team) {
    return TEAMS_TO_FETCH.filter(function(teamToFetchName) {
      return cleanTeamName(teamToFetchName) === cleanTeamName(team.name);
    }).length == 1;
  })
}

exports.handler = function (event, context) {
  console.log('context:', context)

  var functionName = context.functionName;
  var configPromise = configFromDynamo(functionName);

  configPromise.then(function (config) {
    var botList = getGithubBots(config.githubOAuthToken);
    var teams = pagedGithubApiRequest('/orgs/guardian/teams', config.githubOAuthToken, 1, null).then(filterTeamList);
  
    Promise.all([botList, teams]).then(function(bAndT) {
      var bl = bAndT[0];
      var tl = bAndT[1];
      return tl.map(function(t) { return teamToTeamKeysObject(t, bl, config.githubOAuthToken);});
    }).then(function(twk) {
      console.log("There are " + twk.length + " teams to post: " + twk.map(function(team){return team.teamName;}));
      twk.map(function(team) {
        team.teamMembers.then(function(members) {
          postToS3(config.bucket, team.teamName, members);
        });
      });
    })
  });
};

// For testing locally
if (process.env["KEYS_TO_S3_RUN_LOCAL"] === "true") {
  exports.handler();
}
