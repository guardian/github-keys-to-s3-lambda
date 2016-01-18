//exports.handler contains the logic to be executed when the lambda function is run.

var rp = require('request-promise');
var Promise = require('promise');
var AWS = require('aws-sdk');

var GITHUB_BOTS = ['prout-bot', 'guardian-ci', 'gu-who-guardian', 'GuardianAndroid'];
// add your github team name here to add your team's keys to the bucket
// (see https://github.com/orgs/guardian/teams)
var TEAMS_TO_FETCH = ['Digital CMS', 'OpsManager-SSHAccess', 'Editorial Tools SSHAccess', 'Guardian Frontend', 'Discussion']

function githubApiRequest(path) {
  return rp({
    uri: 'https://api.github.com' + path,
    headers: {
      'Authorization': 'token ' + process.env["GITHUB_OAUTH_TOKEN"],
      'User-Agent': 'nodey'
    },
    qs: {
        per_page: 100
    },
    json: true
  }).catch(function(err) {
    console.error(err);
  });
}

function membersListToLogin(membersList) {
  return membersList.map(function (member) {
    return member.login;
  })
}

function removeBots(usernameList) {
  return usernameList.filter(function (name){ return GITHUB_BOTS.indexOf(name) < 0})
}

function usernameListToKeysList(usernameList) {
  return Promise.all(usernameList.map(function (username) {
    return githubApiRequest('/users/' + username + '/keys').then(function(keyResult) {
      if (keyResult[0]) {
        var userKeys = keyResult.map(function(key) {
          return key.key + ' ' + username;
        }).join('\n');
        return userKeys;
      } else {
        console.log("No key for user " + username);
        return "";
      }
    });
  })).then(function(unl) {
    return unl.join('\n');
  });
}

function teamToTeamKeysObject(team) {
  return {
    teamName: team.name,
    teamMembers: githubApiRequest('/teams/' + team.id + '/members')
    .then(membersListToLogin)
    .then(removeBots)
    .then(usernameListToKeysList)
  }
}

function cleanTeamName(name) {
  return name.replace(/ /g, '-');
}

function postToS3(teamName, body) {
  var s3 = new AWS.S3();
  var key = cleanTeamName(teamName) + '/authorized_keys';
  var params = {Bucket: 'github-team-keys', Key: key, Body: body};

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
  var teamList = githubApiRequest('/orgs/guardian/teams').then(filterTeamList);
  var teamsWithKeys = teamList.then(function(tl) {
    return tl.map(teamToTeamKeysObject);
  });

  teamsWithKeys.then(function(twk) {
    console.log("There are " + twk.length + " teams to post: " + twk.map(function(team){return team.teamName;}));
    twk.map(function(team) {
      team.teamMembers.then(function(members) {
        postToS3(team.teamName, members);
      });
    });
  })
};

// For testing locally
if (process.env["KEYS_TO_S3_RUN_LOCAL"] === "true") {
  exports.handler();
}
