// api/users.js (serverless function)
const express = require('express');
const app = express();

// Define your route and logic
app.get('/api/users', (req, res) => {
  // Handle GET request for /api/users
  res.json({ users: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }] });
});

module.exports = app;
