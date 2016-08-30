//exports.handler contains the logic to be executed when the lambda function is run.

var rp = require('request-promise');
var Promise = require('promise');
var AWS = require('aws-sdk');

// add your github team name here to add your team's keys to the bucket
// (see https://github.com/orgs/guardian/teams)
var TEAMS_TO_FETCH = ['Digital CMS', 'OpsManager-SSHAccess', 'Editorial Tools SSHAccess', 'Guardian Frontend', 'Discussion', 'Data Technology', 'Teamcity', 'Deploy Infrastructure', 'Membership and Subscriptions', 'Domains platform', 'Commercial dev', 'Content Platforms', 'Multimedia']

function githubApiRequest(path, page) {
  return rp({
    uri: 'https://api.github.com' + path,
    headers: {
      'Authorization': 'token ' + process.env["GITHUB_OAUTH_TOKEN"],
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

function pagedGithubApiRequest(path, page, teamList) {
    if (teamList) {
        return githubApiRequest(path, page).then(function(resp) {
            if (resp.length === 0) return teamList;
            else return pagedGithubApiRequest(path, page+1, teamList.concat(resp));
            })
    } else {
        return githubApiRequest(path, page).then(function(resp){
            return pagedGithubApiRequest(path, page+1, resp)
        })
    }
}

function membersListToLogin(membersList) {
  return membersList.map(function (member) {
    return member.login;
  })
}

function getGithubBots() {
  return githubApiRequest('/teams/748826/members').then(function (botsTeam) {
    return botsTeam.map(function(member) {
      return member.login;
    });
  });
}

function removeBots(usernameList, botList) {
  return usernameList.filter(function (name){ return botList.indexOf(name) < 0})
}

function usernameListToKeysList(usernameList) {
  return Promise.all(usernameList.map(function (username) {
    return githubApiRequest('/users/' + username + '/keys').then(function(keyResult) {
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

function teamToTeamKeysObject(team, botList) {
  return {
    teamName: team.name,
    teamMembers: githubApiRequest('/teams/' + team.id + '/members')
    .then(membersListToLogin)
    .then(function(logins) { return removeBots(logins, botList);})
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
  var teamList = pagedGithubApiRequest('/orgs/guardian/teams', 1, null).then(filterTeamList);
  var botList = getGithubBots();
  var teamsWithKeys = teamList.then(function(tl) {
    return botList.then(function(bl) {
        return tl.map(function(t) { return teamToTeamKeysObject(t, bl);});
      });
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
