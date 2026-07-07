// pages/api/ask.js
import { Portkey } from 'portkey-ai';

export default async function handler(req, res) {
  // 1. Safety check: Only allow POST requests (sending data)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are allowed' });
  }

  try {
    // 2. Initialize Portkey with your API key from .env.local
    const portkey = new Portkey({
      apiKey: process.env.PORTKEY_API_KEY,
    });

    // 3. Get the question from the person using your API
    const userQuestion = req.body.question;

    // 4. Send the question to the AI through Portkey
    //    IMPORTANT: Change the model name to match YOUR Groq provider slug!
    //    If your slug is 'groq-prod', use '@groq-prod/llama-3.1-70b-versatile'
    //    If you set up Claude, use '@anthropic/claude-sonnet-4-5-20250929'
    const response = await portkey.chat.completions.create({
      model: '@groq-prod/llama-3.3-70b-versatile', // 👈 CHANGE THIS TO YOUR SLUG
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: userQuestion }
      ],
      max_tokens: 250, // Limits how long the answer is
    });

    // 5. Send the AI's answer back to the user
    res.status(200).json({
      success: true,
      answer: response.choices[0].message.content
    });

  } catch (error) {
    // 6. If anything breaks, send back the error message
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}