import { createClient } from '@libsql/client/web';
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const client = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

// Use a strong secret from your .env in production
const JWT_SECRET = process.env.JWT_SECRET || "valyrian_steel_secret_key";

exports.handler = async (event) => {
  const method = event.httpMethod;
  const pathParts = event.path.split('/').filter(Boolean);
  const lastPathPart = pathParts[pathParts.length - 1];
  
  // Try to parse body, handle empty bodies gracefully
  let body = {};
  try { if (event.body) body = JSON.parse(event.body); } catch (e) {}

  try {
    // --- 1. SIGNUP (With 10-user limit) ---
    if (method === 'POST' && lastPathPart === 'signup') {
      // Check current user count
      const countRes = await client.execute("SELECT COUNT(*) as count FROM users");
      if (countRes.rows[0].count >= 10) {
        return { statusCode: 403, body: JSON.stringify({ error: "The archives are full. No more registrations allowed." }) };
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
      console.log("Login Body Received:", body); // CHECK THIS IN TERMINAL

      const { username, password } = body; 

      if (!username || !password) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing fields" }) };
      }

      const result = await client.execute({
        sql: "SELECT * FROM users WHERE username = ?",
        args: [username]
      });
      const user = result.rows[0];

      if (!user) {
        console.log("User not found in DB");
        return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials" }) };
      }

      const isMatch = await bcrypt.compare(password, user.password);
      console.log("Password match result:", isMatch);

      if (!isMatch) {
        return { statusCode: 401, body: JSON.stringify({ error: "Invalid credentials" }) };
      }

      const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
      return { 
        statusCode: 200, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, username: user.username }) 
      };
    }

    // --- AUTH GATEKEEPER FOR WORD ACTIONS ---
    // Extract token from header: "Bearer <token>"
    const authHeader = event.headers.authorization;
    if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: "Authorized access only" }) };
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    // --- 3. GET WORDS (Only yours) ---
    if (method === 'GET') {
      const id = lastPathPart !== 'api' ? lastPathPart : null;
      if (id && !isNaN(id)) {
        const result = await client.execute({
          sql: "SELECT * FROM words WHERE id = ? AND user_id = ?",
          args: [id, userId]
        });
        return { statusCode: 200, body: JSON.stringify(result.rows[0]) };
      } else {
        const result = await client.execute({
          sql: "SELECT * FROM words WHERE user_id = ? ORDER BY created_at DESC",
          args: [userId]
        });
        return { statusCode: 200, body: JSON.stringify(result.rows) };
      }
    }

    // --- 4. POST WORD (Linked to user) ---
    if (method === 'POST') {
      const { word, meaning, example_sentence, notes, difficulty, tags } = body;
      const wordResult = await client.execute({
        sql: "INSERT INTO words (word, meaning, example_sentence, notes, difficulty, user_id) VALUES (?, ?, ?, ?, ?, ?)",
        args: [word, meaning, example_sentence || "", notes || "", difficulty || "Medium", userId]
      });

      const wordId = wordResult.lastInsertRowid;

      if (tags && tags.trim() !== "") {
        const tagList = tags.split(',').map(t => t.trim().toLowerCase());
        for (const tagName of tagList) {
          await client.execute({ sql: "INSERT OR IGNORE INTO tags (name) VALUES (?)", args: [tagName] });
          const tagRow = await client.execute({ sql: "SELECT id FROM tags WHERE name = ?", args: [tagName] });
          const tagId = tagRow.rows[0].id;
          await client.execute({ sql: "INSERT INTO word_tags (word_id, tag_id) VALUES (?, ?)", args: [wordId, tagId] });
        }
      }
      return { statusCode: 201, body: JSON.stringify({ message: "Saved" }) };
    }

    // --- 5. DELETE WORD ---
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