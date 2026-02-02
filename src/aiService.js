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