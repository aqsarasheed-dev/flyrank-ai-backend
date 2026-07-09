// pages/api/guarded.js
import { Portkey } from 'portkey-ai';

// ------------------------------------------------------------
// 1. THE GUARDRAIL (The Security Bouncer) - FIXED VERSION
// ------------------------------------------------------------
function isMaliciousSql(query) {
  // Strip extra spaces and make lowercase
  const clean = query.toLowerCase().replace(/\s+/g, ' ').trim();

  console.log(`[Guardrail] Checking: "${clean}"`);

  // The Denylist — ';' is REMOVED to avoid false positives on safe queries
  const dangerousPatterns = [
    'drop table',
    'delete from',
    'truncate table',
    'insert into',
    'update ',
    'alter table',
    'create table',
    '--',        // SQL comment
    'exec ',
    'xp_',
    'sp_',
    'drop database',
    'grant ',
    'revoke ',
  ];

  for (const pattern of dangerousPatterns) {
    if (clean.includes(pattern)) {
      console.log(`[Guardrail] ❌ BLOCKED! Found pattern: "${pattern}"`);
      return true;
    }
  }

  console.log(`[Guardrail] ✅ SAFE! No dangerous patterns found.`);
  return false;
}

// ------------------------------------------------------------
// 2. THE API ENDPOINT
// ------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are allowed' });
  }

  try {
    const portkey = new Portkey({
      apiKey: process.env.PORTKEY_API_KEY,
    });

    const userQuestion = req.body.question;

    // Ask the AI to generate a SQL query
    const response = await portkey.chat.completions.create({
      model: '@groq-prod/llama-3.3-70b-versatile', // 👈 YOUR GROQ SLUG
      messages: [
        {
          role: 'system',
          content: `You are a SQL assistant. Generate ONLY a SQL query based on the user's request.
          Return ONLY the SQL query. No explanations, no markdown, no extra text.
          Example: If asked "Show me all users", return "SELECT * FROM users;"`
        },
        { role: 'user', content: userQuestion }
      ],
      max_tokens: 150,
    });

    const generatedSql = response.choices[0].message.content;

    // RUN THE GUARDRAIL CHECK
    if (isMaliciousSql(generatedSql)) {
      return res.status(400).json({
        success: false,
        error: '🚫 Guardrail blocked the request: Generated SQL contains dangerous patterns.',
        generatedSql: generatedSql,
        message: 'This query was blocked by the lexical guardrail (denylist check).',
      });
    }

    // If safe, return the SQL
    res.status(200).json({
      success: true,
      sql: generatedSql,
      status: '✅ SAFE - Guardrail passed.',
      note: 'In a real app, you would now execute this SQL on your database.',
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}