// pages/api/structured.js
import { Portkey } from 'portkey-ai';
import { z } from 'zod'; // 👈 The validation library

// 1. Define the "Form" we want the AI to fill out.
//    We are telling Zod: "The AI must reply with a JSON object that has:
//    - city: a string
//    - country: a string
//    - population: a number"
const CityInfoSchema = z.object({
  city: z.string(),
  country: z.string(),
  population: z.number(),
});

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are allowed' });
  }

  try {
    // Setup Portkey (same as before)
    const portkey = new Portkey({
      apiKey: process.env.PORTKEY_API_KEY,
    });

    const userQuestion = req.body.question;

    // 2. Ask the AI, but THIS TIME we give it strict instructions on how to reply.
    const response = await portkey.chat.completions.create({
      model: '@groq-prod/llama-3.3-70b-versatile', // 👈 Your Groq slug
      messages: [
        {
          role: 'system',
          content: `You are a geography assistant. 
          You MUST reply with a valid JSON object. 
          Do not add any extra text, explanation, or markdown. 
          The JSON must have exactly these fields: 
          - "city" (string): The city name
          - "country" (string): The country name
          - "population" (number): The population of the city
          
          Example response: {"city":"Tokyo","country":"Japan","population":13960000}`
        },
        { role: 'user', content: userQuestion }
      ],
      max_tokens: 250,
    });

    // 3. Get the text the AI wrote
    const rawReply = response.choices[0].message.content;

    // 4. Try to convert the text into a real JavaScript object (JSON)
    //    If the AI added extra text or broke the format, this will throw an error.
    const parsedData = JSON.parse(rawReply);

    // 5. "Guardrail / Flow Gate" - This is the "shouldContinue" check!
    //    We use Zod to check if the AI's reply matches our form exactly.
    //    If it fails, we throw an error and stop the flow.
    const validatedData = CityInfoSchema.parse(parsedData);

    // 6. If we made it this far, the AI followed the rules!
    //    We send the clean, validated data back to the user.
    res.status(200).json({
      success: true,
      data: validatedData,
    });

  } catch (error) {
    // 7. If Zod fails (bad format) OR JSON.parse fails (bad text), we catch it here.
    //    This is your "shouldContinue" gate failing gracefully.
    res.status(400).json({
      success: false,
      error: 'AI did not return a valid structured response.',
      details: error.message,
    });
  }
}