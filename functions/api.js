import { createClient } from '@libsql/client/web';
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const client = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

const JWT_SECRET = process.env.JWT_SECRET || "YOUR_ACTUAL_SECRET_HERE";

exports.handler = async (event) => {
  const method = event.httpMethod;
  const pathParts = event.path.split('/').filter(Boolean);
  const lastPathPart = pathParts[pathParts.length - 1];
  
  let body = {};
  try { if (event.body) body = JSON.parse(event.body); } catch (e) { console.error("JSON Parse Error"); }

  try {
    // --- 1. PUBLIC ROUTES ---
    if (method === 'POST' && lastPathPart === 'signup') {
      const countRes = await client.execute("SELECT COUNT(*) as count FROM users");
      if (countRes.rows[0].count >= 10) return { statusCode: 403, body: JSON.stringify({ error: "Archives full." }) };
      
      const hashedPassword = await bcrypt.hash(body.password, 10);
      await client.execute({
        sql: "INSERT INTO users (username, password) VALUES (?, ?)",
        args: [body.username || "", hashedPassword]
      });
      return { statusCode: 201, body: JSON.stringify({ message: "User registered" }) };
    }

    if (method === 'POST' && lastPathPart === 'login') {
      const result = await client.execute({
        sql: "SELECT * FROM users WHERE username = ?",
        args: [body.username || ""]
      });
      const user = result.rows[0];
      if (!user || !(await bcrypt.compare(body.password, user.password))) {
        return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials" }) };
      }
      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      return { statusCode: 200, body: JSON.stringify({ token, username: user.username }) };
    }

    // --- 2. AUTH GATEKEEPER ---
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: "No token provided" }) };

    const token = authHeader.split(' ')[1];
    let userId;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    } catch (jwtErr) {
      return { statusCode: 401, body: JSON.stringify({ error: "Session expired." }) };
    }

    // --- 3. PROTECTED ROUTES ---

    // A. AI UTILITIES
    if (method === 'POST' && lastPathPart === 'deconstruct') {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.GROK_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { 
              role: "system", 
              content: "You are a linguistics expert. Return ONLY a JSON object. If the user asks for analysis, explain the grammar. If the user asks for creative usage of a word, provide a nuanced 'explanation' and two 'variations' (formal and casual)." 
            },
            { role: "user", content: body.text }
          ],
          response_format: { type: "json_object" }
        })
      });
      const data = await response.json();
      return { statusCode: 200, body: JSON.stringify(JSON.parse(data.choices[0].message.content)) };
    }

    if (method === 'POST' && lastPathPart === 'check-ai') {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", { // Fixed URL to match others
          method: "POST",
          headers: { "Authorization": `Bearer ${process.env.GROK_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: "You are a vocabulary tutor. Provide a very brief correction (max 20 words)." },
              { role: "user", content: `Word: "${body.word}". Sentence: "${body.sentence}".` }
            ],
            temperature: 0.5, max_tokens: 50
          })
        });
        const data = await response.json();
        return { statusCode: 200, body: JSON.stringify({ text: data.choices[0].message.content }) };
    }

    // NEW ROUTE: AI Word Examples
    if (method === 'POST' && lastPathPart === 'generate-examples') {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.GROK_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "user", content: body.prompt }
          ],
          response_format: { type: "json_object" }, // Ensures Groq returns valid JSON as requested in the prompt
          temperature: 0.7 
        })
      });
      const data = await response.json();
      
      // Sending it back wrapped in { text: ... } to match what the frontend expects
      return { statusCode: 200, body: JSON.stringify({ text: data.choices[0].message.content }) };
    }

    // B. SENTENCES RESOURCE
    if (pathParts.includes('sentences')) {
      if (method === 'GET') {
        const result = await client.execute({
          sql: "SELECT * FROM sentences WHERE user_id = ? ORDER BY created_at DESC",
          args: [userId]
        });
        return { statusCode: 200, body: JSON.stringify(result.rows) };
      }
      if (method === 'POST') {
        await client.execute({
          sql: "INSERT INTO sentences (text, explanation, formal_version, casual_version, user_id) VALUES (?, ?, ?, ?, ?)",
          args: [body.text || "", body.explanation || "", body.formal_version || "", body.casual_version || "", userId]
        });
        return { statusCode: 201, body: JSON.stringify({ message: "Sentence saved" }) };
      }
      if (method === 'DELETE') {
        await client.execute({ 
          sql: "DELETE FROM sentences WHERE id = ? AND user_id = ?", 
          args: [lastPathPart, userId] 
        });
        return { statusCode: 200, body: JSON.stringify({ message: "Deleted" }) };
      }
      if (method === 'PUT' && pathParts.includes('sentences')) {
        const id = lastPathPart; 
        const { text, explanation } = body;
        
        await client.execute({
          sql: "UPDATE sentences SET text = ?, explanation = ? WHERE id = ? AND user_id = ?",
          args: [text || "", explanation || "", id, userId]
        });
        
        return { statusCode: 200, body: JSON.stringify({ message: "Updated" }) };
      }
    }


  // --- C. DAILY CHALLENGE SCENARIOS ---

    if (method === 'GET' && lastPathPart === 'daily-scenario') {
      const result = await client.execute({
        sql: "SELECT * FROM words WHERE user_id = ? ORDER BY RANDOM() LIMIT 1",
        args: [userId]
        
      });

      let targetWord = "resilient";
      let wordId = "fallback-1";
      let wordMeaning = "able to withstand or recover quickly from difficult conditions";

      if (result.rows.length > 0) {
        targetWord = result.rows[0].word;
        wordId = result.rows[0].id;
        wordMeaning = result.rows[0].meaning;
      }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.GROK_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { 
              role: "system", 
              content: "You are a witty language memory coach. Generate a vivid, slightly funny 1-2 sentence scenario where the user needs to use the target word. Replace the target word with '_____'. Then, generate 3 incorrect but plausible alternative words. Return ONLY a JSON object with keys: 'text' (the scenario), 'hint' (simplified meaning), and 'options' (an array of 4 strings containing the target word and the 3 incorrect words, shuffled into a random order)." 
            },
            { role: "user", content: `Target Word: "${targetWord}". Dictionary Meaning: "${wordMeaning}"` }
          ],
          response_format: { type: "json_object" },
          temperature: 0.8 
        })
      });
      
      const data = await response.json();
      const aiScenario = JSON.parse(data.choices[0].message.content);

      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          id: wordId, 
          text: aiScenario.text, 
          hint: aiScenario.hint,
          options: aiScenario.options
        }) 
      };
    }

    if (method === 'POST' && lastPathPart === 'check-scenario') {
      const { scenarioId, answer, options } = body; 

      let targetWord = "resilient"; 
      if (scenarioId !== "fallback-1") {
        const result = await client.execute({
          sql: "SELECT word FROM words WHERE id = ? AND user_id = ?",
          args: [scenarioId, userId]
        });
        
        if (result.rows.length > 0) {
          targetWord = result.rows[0].word;
        } else {
          return { statusCode: 404, body: JSON.stringify({ error: "Word not found in archives." }) };
        }
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.GROK_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { 
              role: "system", 
              content: "You are a supportive language tutor. 1. Check if the user's answer matches the target word (allow close synonyms). 2. Return a JSON object with keys: 'isCorrect' (boolean), 'message' (brief encouraging feedback), and 'definitions' (an object mapping EVERY word in the provided options array to a short, punchy 3-5 word definition)." 
            },
            { 
              role: "user", 
              content: `Target Word: "${targetWord}". User's Guess: "${answer}". All Options: ${JSON.stringify(options)}` 
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3 
        })
      });
      
      const data = await response.json();
      const grading = JSON.parse(data.choices[0].message.content);

      return { statusCode: 200, body: JSON.stringify(grading) };
    }


    // C. WORDS RESOURCE (Generic Fallback)
    if (method === 'GET') {
      const id = !isNaN(lastPathPart) ? lastPathPart : null;
      if (id) {
        const result = await client.execute({ sql: "SELECT * FROM words WHERE id = ? AND user_id = ?", args: [id, userId] });
        return { statusCode: 200, body: JSON.stringify(result.rows[0]) };
      }
      const result = await client.execute({ sql: "SELECT * FROM words WHERE user_id = ? ORDER BY created_at DESC", args: [userId] });
      return { statusCode: 200, body: JSON.stringify(result.rows) };
    }

    if (method === 'POST') {
      await client.execute({
        sql: "INSERT INTO words (word, meaning, example_sentence, notes, difficulty, user_id, next_review_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [body.word || "", body.meaning || "", body.example_sentence || "", body.notes || "", body.difficulty || "Medium", userId, new Date().toISOString()]
      });
      return { statusCode: 201, body: JSON.stringify({ message: "Word saved" }) };
    }

  if (method === 'PUT') {
      const id = lastPathPart;
      
      // NEW: Save the AI Vibe Check if it's included in the request
      if (body.vibe_one_liner) {
        await client.execute({
          sql: "UPDATE words SET vibe_one_liner = ?, vibe_examples = ? WHERE id = ? AND user_id = ?",
          args: [body.vibe_one_liner, JSON.stringify(body.vibe_examples), id, userId]
        });
        return { statusCode: 200, body: JSON.stringify({ message: "Vibe saved" }) };
      }

      // Existing logic for SRS dates
      if (body.next_review_date && !body.word) {
        await client.execute({ sql: "UPDATE words SET next_review_date = ? WHERE id = ? AND user_id = ?", args: [body.next_review_date, id, userId] });
      } else {
        // Existing logic for standard edits
        await client.execute({
          sql: "UPDATE words SET word = ?, meaning = ?, example_sentence = ?, difficulty = ? WHERE id = ? AND user_id = ?",
          args: [body.word || "", body.meaning || "", body.example_sentence || "", body.difficulty || "Medium", id, userId]
        });
      }
      return { statusCode: 200, body: JSON.stringify({ message: "Updated" }) };
    }

    if (method === 'DELETE') {
      await client.execute({ sql: "DELETE FROM words WHERE id = ? AND user_id = ?", args: [lastPathPart, userId] });
      return { statusCode: 200, body: JSON.stringify({ message: "Deleted" }) };
    }

  } catch (err) {
    console.error("API Error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error", details: err.message }) };
  }
};