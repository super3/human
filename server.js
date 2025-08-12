const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve your frontend files

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Groq API proxy endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    console.log('Received chat request with messages:', messages);
    
    if (!process.env.GROQ_API_KEY) {
      console.error('API key not configured in .env file');
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    console.log('Using API key:', process.env.GROQ_API_KEY.substring(0, 10) + '...');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',  // Updated model name
        messages: messages,
        temperature: 0.7,
        max_tokens: 150,
        stream: false
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq API error:', response.status, error);
      return res.status(response.status).json({ error: error });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Frontend available at http://localhost:${PORT}`);
  console.log(`API endpoint at http://localhost:${PORT}/api/chat`);
});