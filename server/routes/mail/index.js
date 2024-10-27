import fs from 'fs';
import readline from 'readline';
import { google } from 'googleapis';
import { SECRETS_PATH, readSecret, writeSecret } from '../../secrets';
import { entryMap } from '../../util';
import { domains } from '../../domains';

let gmail;

// If modifying these scopes, delete token.json.
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_SECRET = '/mail/token.json';
const CREDS_SECRET = '/mail/credentials.json';

// Load client secrets from a local file.
readSecret(CREDS_SECRET).then(creds => {
  authorize(creds, (auth) => {
    gmail = google.gmail({version: 'v1', auth});
  });
}).catch(console.log)

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  readSecret(TOKEN_SECRET).then(token => {
    oAuth2Client.setCredentials(token)
    callback(oAuth2Client)
  }).catch(err => {
    console.log(err)
    getNewToken(oAuth2Client, callback)
  })
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      writeSecret(TOKEN_SECRET, token)
      callback(oAuth2Client)
    });
  });
}

const linkRegex = /(?:https?:\/\/)?((?:[\w\-]+\.)+[\w\-/#~\+]{2,})/gi
const nestedLinkRegex = /href="<a href="(.+)">.+<\/a>"/gi
const convertLinks = str => {
  // console.log(str.split(linkRegex).filter(part => part))
  return str?.split(linkRegex).filter(part => part).map((part, i) => {
    if (linkRegex.test(part)) {
      return part
        .replace(linkRegex, `<a href="https://$1">$&</a>`)
        .replace(/href="https:\/\/((?:ht|f)tp(?:s?)\:\/\/|~\/|\/)/i, `href="$1`)
    } else {
      return part
    }
  }).join('').replace(nestedLinkRegex, 'href="$1"')
}

function buildRequest(subject, domain, to, message, extraHeaders=[]) {
  console.log(domain, 'from:', entryMap(Object.values(domains), x => ({ [x]: `notifications@${x}` }))[domain] || 'notifications@freshman.dev')
  message = convertLinks(message)
  const content = [
    'Content-Type: text/html; charset="UTF-8"',
    'MIME-Version: 1.0',
    'Content-Transfer-Encoding: base64',
    `Subject: ${subject}`,
    // `From: cyrus@freshman.dev`,
    `From: ${domain || 'freshman.dev'} <${{
      'wordbase.app': 'notifications@wordbase.app'
    }[domain] || 'notifications@freshman.dev'}>`,
    // 'From: wordbase.app <notifications@wordbase.app>',
    `To: ${to}`,
    ...extraHeaders,
    '',
    `<div style="white-space:pre">${message}</div>`,
  ].join('\n');
  console.debug('[MAIL:request', content)
  return {
    auth: gmail.context.auth,
    userId: 'me',
    resource: {
      // raw: Buffer.from(content).toString("base64").replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      // raw: content // btoa(content).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      raw: Buffer.from(content, 'utf8').toString('base64') // .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    },
  }
}
function execRequest(request) {
  return new Promise((resolve, reject) => {
    gmail.users.messages.send(request, (err, res) => {
      if (err) {
        console.log(err)
        return reject(err)
      }
      console.log('[MAIL:mailed]', res.data.id)
      return resolve(res)
    });
  })
}


export const send = async (domain, to, subject, message, extraHeaders=[]) => {
  return execRequest(
    buildRequest(subject, domain, to, message, extraHeaders),
  )
}
export const chain = async (domain, baseId, message, extraHeaders=[]) => {
  let res = await gmail.users.messages.get({
    auth: gmail.context.auth,
    userId: 'me',
    id: baseId
  })
  let [from, subject, to, refId] =
    'from subject to message-id'
      .split(' ')
      .map(field => res.data.payload.headers
        .find(item => item.name.toLowerCase() === field).value)

  // I added notifications@wordbase.app, restart existing threads where applicable
  if (domain && !from.includes(domain)) {
    throw `restarting ${from} thread to ${to} with correct domain ${domain}`
  }

  let request = buildRequest(subject, domain, to, message, extraHeaders.concat([
    `In-Reply-To: ${refId}`,
    `References: ${refId}`,
  ]))
  request.resource['threadId'] = baseId
  return execRequest(request)
}
export const thread = async (id) => {
  return new Promise((resolve, reject) => {
    gmail.users.threads.get({
      auth: gmail.context.auth,
      userId: 'me',
      id
    }, (err, res) => {
      if (err) {
        console.log(err)
        return reject(err)
      }
      return resolve(res)
    });
  })
}

export default {
  send,
  chain,
  thread,
}