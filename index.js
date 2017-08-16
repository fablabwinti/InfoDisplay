"use strict";
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var express = require('express');
var app = express();
var router = express.Router();
var path = __dirname + '/views/';
  
var labmanagers = {};
var workshops = {};

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';


// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Calendar API.
  authorize(JSON.parse(content), listEvents);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}


/**
 * Lists all user's calendars.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listCalendars(auth) {
  var calendar = google.calendar('v3');
  console.log('%s', JSON.stringify(calendar));
  calendar.calendarList.list({
    auth: auth
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var calendars = response.items;
    for (var i = 0; i < calendars.length; i++) {
      console.log('%s', JSON.stringify(calendars[i]));
      //console.log('%s', calendar[i].calendarId);
    }
  });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
  var calendar = google.calendar('v3');
  calendar.events.list({
    auth: auth,
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var events = response.items;
    labmanagers = events;
    if (events.length == 0) {
      console.log('No upcoming events found.');
    } else {
      console.log('Got ' + events.length +' upcoming LabManagers from Google Calendar.');
//      for (var i = 0; i < events.length; i++) {
//        var event = events[i];
//        var start = event.start.dateTime || event.start.date;
//        var end = event.end.dateTime || event.end.date;
//        console.log('%s - %s : %s', start, end, event.summary);
//      }
    }
  });
  listWorkshops(auth);
}

/**
 * Lists the next 15 events on the "termine" calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listWorkshops(auth) {
  var calendar = google.calendar('v3');
  calendar.events.list({
    auth: auth,
    calendarId: '6mi8quogdni3bvnjhe787ci7i4@group.calendar.google.com',
    timeMin: (new Date()).toISOString(),
    maxResults: 8,
    singleEvents: true,
    orderBy: 'startTime'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var events = response.items;
    workshops = events;
    if (events.length == 0) {
      console.log('No upcoming events found.');
    } else {
      console.log('Got ' + events.length +' upcoming Workshops from Google Calendar.');
//      for (var i = 0; i < events.length; i++) {
//        var event = events[i];
//        var start = event.start.dateTime || event.start.date;
//        var end = event.end.dateTime || event.end.date;
//        console.log('%s - %s : %s', start, end, event.summary);
//      }
    }
  });
}


// serve static content
app.use(express.static('public'));

app.use('/', router);

router.get('/',function(req, res){
  res.sendFile(path + 'index.html');
});
  
router.get('/product',function(req, res){
  res.sendFile(path + 'product.html');
});
  
router.get('/about',function(req, res){
  res.sendFile(path + 'about.html');
});
  
app.use('*',function(req, res){
  res.send('Error 404: Not Found!');
});
  
app.listen(3000,function(){
  console.log('Server running at Port 3000');
});


/*app.get('/', function (req, res) {
    var body; 
    body = '<h2>LabManagers</h2>';
    body += '<ul>';
    for (var i = 0; i < labmanagers.length; i++) {
        var labmanager = labmanagers[i];
        var start = labmanager.start.dateTime || labmanager.start.date;
        var end = labmanager.end.dateTime || labmanager.end.date;
        body += '<li>' + start + ' - ' + end + ' | ' + labmanager.summary + '</li>';
    }
    body += '</ul>';
    body += '<h2>Workshops</h2>';
    body += '<ul>';
    for (var i = 0; i < workshops.length; i++) {
        var workshop = workshops[i];
        var start = workshop.start.dateTime || workshop.start.date;
        var end = workshop.end.dateTime || workshop.end.date;
        body += '<li>' + start + ' - ' + end + ' | ' + workshop.summary + '</li>';
    }
    body += '</ul>';
    res.send(body);
});
app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
*/
  