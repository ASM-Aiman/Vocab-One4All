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
        const response = await fetch(process.env.GROK_API_URL, {
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
      // Inside your Protected Routes in api.js:
      if (method === 'PUT' && pathParts.includes('sentences')) {
        const id = lastPathPart; // This gets the ID from /sentences/123
        const { text, explanation } = body;
        
        await client.execute({
          sql: "UPDATE sentences SET text = ?, explanation = ? WHERE id = ? AND user_id = ?",
          args: [text || "", explanation || "", id, userId]
        });
        
        return { statusCode: 200, body: JSON.stringify({ message: "Updated" }) };
      }
    }


      if (method === 'POST' && lastPathPart === 'coach-session') {
  // Fetch archive for context
  const result = await client.execute({
    sql: "SELECT text, explanation FROM sentences WHERE user_id = ? LIMIT 10",
    args: [userId]
  });
  
  const archiveContext = result.rows.map(r => `Sentence: ${r.text} (Context: ${r.explanation})`).join('\n');

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.GROK_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { 
          role: "system", 
          content: `You are a Fluency Coach. 
          If the user provides a specific word/context to practice, build a scenario around THAT. 
          Otherwise, use their ARCHIVE to pick a challenge.
          Current Archive:\n${archiveContext}
          
          Tone: Encouraging but corrective. Always use 'Shadow Correction' if they mess up.` 
        },
        { role: "user", content: body.message || "Start the session." }
      ]
    })
  });
  
  const data = await response.json();
  return { statusCode: 200, body: JSON.stringify({ reply: data.choices[0].message.content }) };
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
      if (body.next_review_date && !body.word) {
        await client.execute({ sql: "UPDATE words SET next_review_date = ? WHERE id = ? AND user_id = ?", args: [body.next_review_date, id, userId] });
      } else {
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