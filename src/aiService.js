import axios from './api';

export const checkSentence = async (word, sentence) => {
  try {
    // Get the token from localStorage
    const token = localStorage.getItem('token');

    const res = await axios.post('/check-ai', 
      { word, sentence },
      {
        headers: {
          // Manually passing the token if your axios instance doesn't
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    if (res.data && res.data.text) {
      return res.data.text.trim();
    }
    
    return "The tutor is speechless. Try again!";
  } catch (error) {
    console.error("AI Service Error:", error);
    return "Connection to the Archive Tutor lost.";
  }
};

export const getWordExamples = async (word) => {
  const prompt = `
    Act as a conversational English vocabulary coach. 
    For the word "${word}", provide:
    1. A short, punchy one-liner explaining the meaning and connotation (its "vibe").
    2. Exactly 4 natural, modern, and everyday examples of how a native speaker would use it to sound natural.

    Return ONLY a valid JSON object in this exact format, with no markdown formatting or extra text:
    {
      "oneLiner": "...",
      "examples": ["example 1", "example 2", "example 3", "example 4"]
    }
  `;

  try {
    // Get the token from localStorage just like in checkSentence
    const token = localStorage.getItem('token');

    // Use your configured axios instance
    const res = await axios.post('/generate-examples', 
      { prompt },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    // Assuming your backend returns the AI's response inside a 'text' property
    if (res.data && res.data.text) {
      // Clean up the string and parse it into a JavaScript object
      const cleanJson = res.data.text.trim();
      return JSON.parse(cleanJson);
    }

    throw new Error("Invalid response format from AI");
    
  } catch (error) {
    console.error("Failed to fetch AI examples:", error);
    throw error;
  }
};