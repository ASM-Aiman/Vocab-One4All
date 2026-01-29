import { createClient } from '@libsql/client/web';
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const client = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

const JWT_SECRET = process.env.JWT_SECRET || "valyrian_steel_secret_key";

exports.handler = async (event) => {
  const method = event.httpMethod;
  const pathParts = event.path.split('/').filter(Boolean);
  const lastPathPart = pathParts[pathParts.length - 1];
  
  let body = {};
  try { if (event.body) body = JSON.parse(event.body); } catch (e) {}

  try {
    // --- 1. SIGNUP ---
    if (method === 'POST' && lastPathPart === 'signup') {
      const countRes = await client.execute("SELECT COUNT(*) as count FROM users");
      if (countRes.rows[0].count >= 10) {
        return { statusCode: 403, body: JSON.stringify({ error: "Archives full." }) };
      }
      const hashedPassword = await bcrypt.hash(body.password, 10);
      await client.execute({
        sql: "INSERT INTO users (username, password) VALUES (?, ?)",
        args: [body.username, hashedPassword]
      });
      return { statusCode: 201, body: JSON.stringify({ message: "User registered" }) };
    }

    // --- 2. LOGIN ---
    if (method === 'POST' && lastPathPart === 'login') {
      const { username, password } = body; 
      const result = await client.execute({
        sql: "SELECT * FROM users WHERE username = ?",
        args: [username]
      });
      const user = result.rows[0];
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials" }) };
      }
      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      return { statusCode: 200, body: JSON.stringify({ token, username: user.username }) };
    }

    // --- AUTH GATEKEEPER ---
    const authHeader = event.headers.authorization;
    if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    // --- 3. GET WORDS ---
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

    // --- 4. POST WORD (Create) ---
    if (method === 'POST') {
      const { word, meaning, example_sentence, notes, difficulty } = body;
      
      // Create an ISO timestamp for "Right Now"
      const now = new Date().toISOString(); 

      await client.execute({
        sql: "INSERT INTO words (word, meaning, example_sentence, notes, difficulty, user_id, next_review_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [word, meaning, example_sentence || "", notes || "", difficulty || "Medium", userId, now]
      });
      
      return { statusCode: 201, body: JSON.stringify({ message: "Saved" }) };
    }

    // --- 5. PUT WORD (Update - NEW) ---
    if (method === 'PUT') {
      const id = lastPathPart;
      const { word, meaning, example_sentence, difficulty } = body;

      if (!id || isNaN(id)) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid ID" }) };
      }

      await client.execute({
        sql: `UPDATE words 
              SET word = ?, meaning = ?, example_sentence = ?, difficulty = ? 
              WHERE id = ? AND user_id = ?`,
        args: [word, meaning, example_sentence, difficulty, id, userId]
      });

      return { statusCode: 200, body: JSON.stringify({ message: "Updated successfully" }) };
    }

    // --- 6. DELETE WORD ---
    if (method === 'DELETE') {
      const id = lastPathPart;
      await client.execute({ sql: "DELETE FROM word_tags WHERE word_id = ?", args: [id] });
      await client.execute({ sql: "DELETE FROM words WHERE id = ? AND user_id = ?", args: [id, userId] });
      return { statusCode: 200, body: JSON.stringify({ message: "Deleted" }) };
    }

  } catch (err) {
    console.error("API Error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};