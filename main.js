#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

// This scope grants read-only access to calendar events.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

// The file token.json stores the user's access and refresh tokens.
// It's created automatically when the authorization flow completes for the first time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const CALENDAR_ID = '426op8ij7751vsbaaqic8nb7h0@group.calendar.google.com'; //primary

// Get API key from environment variable or set it directly
const API_KEY = process.env.GOOGLE_API_KEY || 'YOUR_API_KEY_HERE';

/**
 * Reads previously authorized credentials from the save file.
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists all calendars the user has access to.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listCalendars(auth) {
  const calendar = google.calendar({
    version: 'v3', 
    auth,
    key: API_KEY // Add API key here
  });
  
  const res = await calendar.calendarList.list();

  const calendars = res.data.items;
  if (!calendars || calendars.length === 0) {
    console.log('No calendars found.');
    return;
  }

  console.log('Your Calendars:');
  calendars.forEach((cal) => {
    // The calendar name is 'summary', and the ID is 'id'
    console.log(`- Name: ${cal.summary}, ID: ${cal.id}`);
  });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listEvents(auth) {
  const calendar = google.calendar({
    version: 'v3', 
    auth,
    key: API_KEY // Add API key here
  });
  
  const res = await calendar.events.list({
    calendarId: CALENDAR_ID, 
    timeMin: (new Date()).toISOString(),
    maxResults: 2500,
    singleEvents: true,
    orderBy: 'startTime',
  });
  
  const events = res.data.items;
  if (!events || events.length === 0) {
    console.log('No upcoming events found.');
    return;
  }

  // Output the full event list as a JSON string
  console.log(JSON.stringify(events, null, 2));
}

//authorize().then(listCalendars).catch(console.error);
authorize().then(listEvents).catch(console.error);
