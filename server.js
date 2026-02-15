const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3007;

app.use(bodyParser.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const announcements = {
  items: [
    { id: 'a1', text: 'Sunday Worship Service: 8:00 AM - 11:00 AM', type: 'service', active: true },
    { id: 'a2', text: 'Thursday Relationship Clinic: 6:00 PM - 8:00 PM', type: 'program', active: true },
    { id: 'a3', text: 'Friday Prophetic & Prayer Service: 6:00 PM - 9:30 PM', type: 'program', active: true }
  ],
  updatedAt: new Date().toISOString()
};

const requireFields = (body, fields) => fields.filter((f) => !body[f]);

app.get('/api/announcements', (_req, res) => {
  res.json(announcements);
});

app.get('/api/announcements/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });

  res.write(`data: ${JSON.stringify(announcements)}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'echoes-chapel', timestamp: new Date().toISOString() });
});

app.post('/contact', (req, res) => {
  const required = ['name', 'email', 'subject', 'message'];
  const missing = requireFields(req.body, required);
  if (missing.length) {
    return res.status(400).json({ message: `Missing: ${missing.join(', ')}` });
  }
  console.log('Contact:', req.body);
  return res.json({ message: 'Contact request received.' });
});

app.post('/donate', (req, res) => {
  const required = ['fullName', 'email', 'amount', 'paymentMethod'];
  const missing = requireFields(req.body, required);
  if (missing.length) {
    return res.status(400).json({ message: `Missing: ${missing.join(', ')}` });
  }
  console.log('Donation:', req.body);
  return res.json({ message: 'Donation submitted successfully.' });
});

app.post('/impact', (req, res) => {
  const required = ['name', 'title', 'story'];
  const missing = requireFields(req.body, required);
  if (missing.length) {
    return res.status(400).json({ message: `Missing: ${missing.join(', ')}` });
  }
  console.log('Impact:', req.body);
  return res.json({ message: 'Impact story submitted.' });
});

app.listen(PORT, () => {
  console.log(`Echoes Chapel server running on http://localhost:${PORT}`);
});
