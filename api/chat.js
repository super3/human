module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Chat API called, method:', req.method);
    const { messages } = req.body;
    console.log('Messages received:', messages?.length);
    
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY not configured in Vercel environment variables');
      return res.status(500).json({ error: 'API key not configured. Please add GROQ_API_KEY to Vercel environment variables.' });
    }
    
    console.log('API key found, making request to Groq...');

    let response;
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: messages,
          temperature: 0.7,
          max_tokens: 150,
          stream: false
        })
      });
    } catch (fetchError) {
      console.error('Error calling Groq API:', fetchError);
      return res.status(500).json({ error: 'Failed to connect to AI service', details: fetchError.message });
    }

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq API error:', response.status, error);
      return res.status(response.status).json({ error: 'AI service error', status: response.status });
    }

    const data = await response.json();
    console.log('Successfully got response from Groq');
    res.status(200).json(data);
  } catch (error) {
    console.error('Error in chat API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}