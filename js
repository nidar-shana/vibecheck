const express = require('express');
const bodyParser = require('body-parser');
const webpush = require('web-push');
const sqlite3 = require('sqlite3').verbose();
const { CronJob } = require('cron');
const path = require('path');

// Load VAPID keys from env or paste generated keys here for quick demo (not recommended for prod)
const VAPID_PUBLIC = process.env.VAPID_PUBLIC || '<PUT_YOUR_PUBLIC_KEY>';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE || '<PUT_YOUR_PRIVATE_KEY>';

webpush.setVapidDetails(
  'mailto:you@example.com',
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple SQLite storage of subscriptions
const db = new sqlite3.Database('./subscriptions.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT UNIQUE,
    p256dh TEXT,
    auth TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Save subscription
app.post('/subscribe', (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint) return res.status(400).json({ error: 'invalid subscription' });
  const p256dh = sub.keys && sub.keys.p256dh || '';
  const auth = sub.keys && sub.keys.auth || '';
  const stmt = db.prepare(`INSERT OR REPLACE INTO subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)`);
  stmt.run(sub.endpoint, p256dh, auth, function(err){
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'db' });
    }
    res.json({ success: true });
  });
  stmt.finalize();
});

// Unsubscribe
app.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'missing endpoint' });
  db.run(`DELETE FROM subscriptions WHERE endpoint = ?`, endpoint, function(err){
    if (err) return res.status(500).json({ error: 'db' });
    res.json({ success: true });
  });
});

// manual trigger to send a single vibe (for testing)
app.post('/send-vibe', async (req, res) => {
  const payload = JSON.stringify({
    title: req.body.title || 'Hourly Vibe Check',
    body: req.body.body || 'How are you feeling right now?'
  });
  try {
    await sendToAll(payload);
    res.json({ sent: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'send failed' });
  }
});

// function to send to all subs
function sendToAll(payload) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT endpoint, p256dh, auth FROM subscriptions`, async (err, rows) => {
      if (err) return reject(err);
      const results = [];
      for (const r of rows) {
        const sub = {
          endpoint: r.endpoint,
          keys: { p256dh: r.p256dh, auth: r.auth }
        };
        try {
          await webpush.sendNotification(sub, payload);
          results.push({ endpoint: r.endpoint, status: 'ok' });
        } catch (e) {
          console.warn('send failed, removing subscription', r.endpoint, e.statusCode || e);
          // remove invalid subscription
          db.run(`DELETE FROM subscriptions WHERE endpoint = ?`, r.endpoint);
          results.push({ endpoint: r.endpoint, status: 'failed' });
        }
      }
      resolve(results);
    });
  });
}

// Cron job to send hourly at minute 0 of every hour
const job = new CronJob('0 0 * * * *', async () => { // seconds precision: at 0 seconds, 0 minutes => top of hour
  const payload = JSON.stringify({
    title: 'Hourly Vibe Check',
    body: 'How are you feeling right now? Tap to respond.'
  });
  try {
    await sendToAll(payload);
    console.log('Hourly vibes sent at', new Date().toISOString());
  } catch (e) {
    console.error('Hourly send failed', e);
  }
});
job.start();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`VAPID_PUBLIC: ${VAPID_PUBLIC}`);
});
