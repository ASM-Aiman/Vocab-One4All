import { createClient } from '@libsql/client/web';
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const client = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

// To this (Use your actual secret string here):
const JWT_SECRET = process.env.JWT_SECRET || "YOUR_ACTUAL_SECRET_HERE";

exports.handler = async (event) => {
  const method = event.httpMethod;
  const pathParts = event.path.split('/').filter(Boolean);
  const lastPathPart = pathParts[pathParts.length - 1];
  
  let body = {};
  try { if (event.body) body = JSON.parse(event.body); } catch (e) { console.error("JSON Parse Error"); }

  try {
    // --- 1. PUBLIC ROUTES (No Token Needed) ---
    
    // SIGNUP
    if (method === 'POST' && lastPathPart === 'signup') {
      const countRes = await client.execute("SELECT COUNT(*) as count FROM users");
      if (countRes.rows[0].count >= 10) {
        return { statusCode: 403, body: JSON.stringify({ error: "Archives full." }) };
      }
      const hashedPassword = await bcrypt.hash(body.password, 10);
      await client.execute({
        sql: "INSERT INTO users (username, password) VALUES (?, ?)",
        args: [body.username || "", hashedPassword]
      });
      return { statusCode: 201, body: JSON.stringify({ message: "User registered" }) };
    }

    // LOGIN
    if (method === 'POST' && lastPathPart === 'login') {
      const { username, password } = body; 
      const result = await client.execute({
        sql: "SELECT * FROM users WHERE username = ?",
        args: [username || ""]
      });
      const user = result.rows[0];
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials" }) };
      }
      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      return { statusCode: 200, body: JSON.stringify({ token, username: user.username }) };
    }
// --- 2. AUTH GATEKEEPER ---
const authHeader = event.headers.authorization || event.headers.Authorization;
console.log("RECEIVED HEADER:", authHeader); // LOG 1

if (!authHeader) {
  return { statusCode: 401, body: JSON.stringify({ error: "No token provided" }) };
}

const token = authHeader.split(' ')[1];
let userId;

try {
  const decoded = jwt.verify(token, JWT_SECRET);
  userId = decoded.userId;
  console.log("JWT VERIFIED FOR USER:", userId); // LOG 2
} catch (jwtErr) {
  console.error("JWT VERIFY ERROR:", jwtErr.message); // LOG 3
  return { statusCode: 401, body: JSON.stringify({ error: "Session expired." }) };
}

    // --- 3. PROTECTED ROUTES (Token Required) ---

    // CHECK AI (Now protected by the gatekeeper)
    if (method === 'POST' && lastPathPart === 'check-ai') {
      const { word, sentence } = body;
      const GROQ_KEY = process.env.GROK_API_KEY;
      const GROQ_URL = process.env.GROK_API_URL;
      console.log("DEBUG: JWT_SECRET IS:", process.env.JWT_SECRET ? "LOADED" : "MISSING (FALLBACK USED)");

      const response = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You are a vocabulary tutor. Provide a very brief correction (max 20 words)." },
            { role: "user", content: `Word: "${word}". Sentence: "${sentence}".` }
          ],
          temperature: 0.5,
          max_tokens: 50
        })
      });

      if (!response.ok) {
        return { statusCode: response.status, body: JSON.stringify({ error: "Groq API Error" }) };
      }

      const data = await response.json();
      return { 
        statusCode: 200, 
        body: JSON.stringify({ text: data.choices[0].message.content }) 
      };
    }

    // GET WORDS
    if (method === 'GET') {
      const id = !isNaN(lastPathPart) ? lastPathPart : null;
      if (id) {
        const result = await client.execute({
          sql: "SELECT * FROM words WHERE id = ? AND user_id = ?",
          args: [id, userId]
        });
        return { statusCode: 200, body: JSON.stringify(result.rows[0]) };
      }
      const result = await client.execute({
        sql: "SELECT * FROM words WHERE user_id = ? ORDER BY created_at DESC",
        args: [userId]
      });
      return { statusCode: 200, body: JSON.stringify(result.rows) };
    }

    // POST WORD (Create)
    if (method === 'POST') {
      const { word, meaning, example_sentence, notes, difficulty } = body;
      const now = new Date().toISOString(); 

      await client.execute({
        sql: "INSERT INTO words (word, meaning, example_sentence, notes, difficulty, user_id, next_review_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [
          word || "", 
          meaning || "", 
          example_sentence || "", 
          notes || "", 
          difficulty || "Medium", 
          userId, 
          now
        ]
      });
      
      return { statusCode: 201, body: JSON.stringify({ message: "Saved" }) };
    }

    // PUT WORD (Update)
    if (method === 'PUT') {
      const id = lastPathPart;
      const { word, meaning, example_sentence, difficulty, next_review_date } = body;

      if (!id || isNaN(id)) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid ID" }) };
      }

      if (next_review_date && !word) {
        await client.execute({
          sql: "UPDATE words SET next_review_date = ? WHERE id = ? AND user_id = ?",
          args: [next_review_date, id, userId]
        });
      } else {
        await client.execute({
          sql: `UPDATE words 
                SET word = ?, meaning = ?, example_sentence = ?, difficulty = ? 
                WHERE id = ? AND user_id = ?`,
          args: [word || "", meaning || "", example_sentence || "", difficulty || "Medium", id, userId]
        });
      }

      return { statusCode: 200, body: JSON.stringify({ message: "Updated successfully" }) };
    }

    // DELETE WORD
    if (method === 'DELETE') {
      const id = lastPathPart;
      await client.execute({ sql: "DELETE FROM words WHERE id = ? AND user_id = ?", args: [id, userId] });
      return { statusCode: 200, body: JSON.stringify({ message: "Deleted" }) };
    }

  } catch (err) {
    console.error("API Error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};