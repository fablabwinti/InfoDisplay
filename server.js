"use strict";
var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var express = require('express');
var app = express();
var router = express.Router();
//var path = __dirname + '/views/';

var today = Array(); //{start: '', end: '', summary: ''};
var labmanagers = Array(); //{start: '', end: '', summary: ''};
var workshops = Array(); // {start: '', end: '', summary: ''};
var clientSecrets = Array();
var lmDB = Array();

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';


// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  clientSecrets = JSON.parse(content);
  // Authorize a client with the loaded credentials, then call the
  // Google Calendar API to read Events and Workshops.
  authorize(clientSecrets, listEvents);
});

setInterval(function getGoogleCallendars() {
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
      if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
      }
      authorize(JSON.parse(content), listEvents);
    });
}, 1000 * 60 * 15); // every 15 minutes


// Load LabManager DB from local file.
fs.readFile('labmanagers.json', function processLabManagers(err, content) {
  if (err) {
    console.log('Error loading labmanagers file: ' + err);
    return;
  }
  lmDB = JSON.parse(content);
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
    console.log(calendars);
    for (var i = 0; i < calendars.length; i++) {
      console.log('%s', JSON.stringify(calendars[i]));
      //console.log('%s', calendar[i].calendarId);
    }
  });
}

/**
 * Lists the next 6 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
  var calendar = google.calendar('v3');
  calendar.events.list({
    auth: auth,
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 6,
    singleEvents: true,
    orderBy: 'startTime'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var events = response.items;
    labmanagers = Array();
    if (events.length == 0) {
      console.log('No upcoming events found.');
    } else {
      console.log('Got ' + events.length +' upcoming LabManagers from Google Calendar.');
      var firstToday = 1;
      var startUTC = new Date(events[0].start.dateTime);
      if (startUTC.getDate() == new Date().getDate()){
          firstToday = 0;
      }
      for (var i = 0; i < (events.length - firstToday); i++) {
        var event = events[i];
        var startUTC = new Date(event.start.dateTime);
        var start = formatStartDate(startUTC);
        var endUTC = new Date(event.end.dateTime);
        var end = formatEndTime(endUTC);
        var summary = event.summary;
        var startName = event.summary.search(/LabManager:/i) + 11;
        var name, lm;
        if (startName > 11) {
            name = event.summary.substr(startName).trim();
            lm = lmDB[name];
            if (typeof(lm) === 'undefined'){
            } else {
                if (startUTC.getDate() == new Date().getDate()){
                  start = formatEndTime(startUTC);
                  today = {start: start, end: end, lm: lm};
                } else {
                  labmanagers.push({start: start, end: end, lm: lm});
                }
            }
        }
        console.log('%s bis %s : %s (%s)', start, end, lm.name, lm.image);
      }
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
    maxResults: 4,
    singleEvents: true,
    orderBy: 'startTime'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var events = response.items;
    workshops = Array();
    //workshops = events;
    if (events.length == 0) {
      console.log('No upcoming events found.');
    } else {
      console.log('Got ' + events.length +' upcoming Workshops from Google Calendar.');
      for (var i = 0; i < events.length; i++) {
        var event = events[i];
        var startUTC = new Date(event.start.dateTime);
        var start = formatStartDate(startUTC);
        var endUTC = new Date(event.end.dateTime);
        var end = formatEndTime(endUTC);
        var summary = event.summary;
        workshops.push({start: start, end: end, summary: summary});
        console.log('%s - %s : %s', start, end, summary);
      }
    }
  });
}

function formatStartDate(utc){
    var day = utc.getDate();
    var month = utc.getMonth()+1;
    var year = utc.getFullYear();
    var hours = utc.getHours();
    var minutes = utc.getMinutes();
    if (day<10) day = '0' + day;
    if (month<10) month = '0' + month;
    if (hours<10) hours = '0' + hours;
    if (minutes<10) minutes = '0' + minutes;
    return day + '.' + month + '.' + year + ' ' + hours + ':' + minutes;
}

function formatEndTime(utc){
    var hours = utc.getHours();
    var minutes = utc.getMinutes();
    if (hours<10) hours = '0' + hours;
    if (minutes<10) minutes = '0' + minutes;
    return hours + ':' + minutes;
}


// serve static content
app.use(express.static('public'));

// set view engine and views folder
app.set('view engine', 'pug');
app.set('views', './views');

app.use('/', router);

router.get('/',function(req, res){
    var now = new Date();
    var curdate = now.getDate() + '.' + (now.getMonth()+1) + '.' + now.getFullYear();
    res.render('index', { title: 'FabLab InfoDisplay', message: 'InfoDisplay', curdate: curdate, today: today, labmanagers: labmanagers, workshops: workshops});
    //res.sendFile(path + 'index.html');
});

app.use('*',function(req, res){
  res.send('Error 404: Not Found!');
});

app.listen(3030,function(){
  console.log('Server running at Port 3030');
});
