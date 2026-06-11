import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Robustly extracts the first complete JSON object from text by matching curly braces.
 * Handles strings, escaped characters, and ignores trailing text.
 */
const extractJSON = (text) => {
  const startIndex = text.indexOf('{');
  if (startIndex === -1) {
    throw new Error('Could not find JSON object start in response');
  }

  let braceCount = 0;
  let inString = false;
  let stringChar = null;
  let escaped = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (inString) {
      if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        return text.substring(startIndex, i + 1);
      }
    }
  }

  throw new Error('Could not find complete JSON object in response');
};

/**
 * Calls the Gemini API to generate explanation, sample answer, and key points for a question.
 * Optimized for low latency (< 1 second responses).
 * 
 * @param {string} question - The interview question.
 * @param {string} [customApiKey] - User provided API key override.
 * @returns {Promise<{explanation: string, sampleAnswer: string, keyPoints: string[]}>}
 */
export const generateInterviewResponse = async (question, customApiKey = '') => {
  const apiKey = customApiKey || import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Gemini API Key is missing. Please set the VITE_GEMINI_API_KEY environment variable or enter it in the settings.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Use gemini-3.1-flash-lite (optimized for ultra low-latency)
  // Configure responseMimeType to "application/json" for faster structured streaming and lower token count.
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,       // Lower temperature speeds up token generation
      maxOutputTokens: 450,   // Prevent truncation of detailed responses
    }
  });

  const prompt = `As a technical mentor, answer this question: "${question}"
If the question is specifically asking you to write code/program/function, provide ONLY the clean, well-formatted code block in "codeBlock" (always write this code in the JavaScript language only; do not use any other programming language under any circumstances), leave "explanation" empty, and set "isCodeOnly" to true.
Otherwise, set "isCodeOnly" to false, leave "codeBlock" empty, and provide "explanation" and "keyPoints".

JSON Output:
{
  "isCodeOnly": true or false,
  "codeBlock": "Clean programming code block in JavaScript (leave empty if isCodeOnly is false)",
  "explanation": "Brief explanation (max 2 sentences, leave empty if isCodeOnly is true)",
  "sampleAnswer": "First-person sample response (max 3 sentences)",
  "keyPoints": [
    "Brief point 1",
    "Brief point 2",
    "Brief point 3",
    "Brief point 4",
    "Brief point 5"
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Extract JSON using brace matching parser
    const jsonStr = extractJSON(responseText);
    const parsed = JSON.parse(jsonStr);
    
    // Ensure default properties exist to prevent errors and validate basic structure
    if (parsed.isCodeOnly === undefined) {
      parsed.isCodeOnly = false;
    }
    if (!parsed.codeBlock) parsed.codeBlock = '';
    if (!parsed.explanation) parsed.explanation = '';
    if (!parsed.keyPoints) parsed.keyPoints = [];
    if (!parsed.sampleAnswer) parsed.sampleAnswer = '';

    if (parsed.isCodeOnly && !parsed.codeBlock) {
      parsed.codeBlock = parsed.explanation;
    }
    
    return parsed;
  } catch (error) {
    console.error('Error in geminiService:', error);
    throw new Error(error.message || 'Failed to generate answer from Gemini AI.');
  }
};

/**
 * Converts a Blob to a Base64 encoded string.
 */
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result.split(',')[1];
      resolve(base64data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Sends audio to Gemini for transcription and analysis in a single call.
 * Optimized for low latency.
 */
export const generateInterviewResponseFromAudio = async (audioBlob, customApiKey = '') => {
  const apiKey = customApiKey || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API Key is missing. Please set the VITE_GEMINI_API_KEY environment variable or enter it in the settings.');
  }

  const base64Audio = await blobToBase64(audioBlob);
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 450, // Higher capacity to accommodate detectedQuestion + explanation + keyPoints
    }
  });

  const audioPart = {
    inlineData: {
      data: base64Audio,
      mimeType: audioBlob.type || 'audio/webm'
    }
  };

  const prompt = `As a technical mentor, listen to this spoken audio.
First, transcribe exactly what the speaker said.
Then, answer the transcribed question.
If the question is specifically asking you to write code/program/function, provide ONLY the clean, well-formatted code block in "codeBlock" (always write this code in the JavaScript language only; do not use any other programming language under any circumstances), leave "explanation" empty, and set "isCodeOnly" to true.
Otherwise, set "isCodeOnly" to false, leave "codeBlock" empty, and provide "explanation" and "keyPoints".

JSON Output:
{
  "detectedQuestion": "Exact transcription of the spoken audio",
  "isCodeOnly": true or false,
  "codeBlock": "Clean programming code block in JavaScript (leave empty if isCodeOnly is false)",
  "explanation": "Brief explanation (max 2 sentences, leave empty if isCodeOnly is true)",
  "sampleAnswer": "First-person sample response (max 3 sentences)",
  "keyPoints": [
    "Brief point 1",
    "Brief point 2",
    "Brief point 3",
    "Brief point 4",
    "Brief point 5"
  ]
}`;

  try {
    const result = await model.generateContent([audioPart, prompt]);
    const responseText = result.response.text();
    
    // Extract JSON using brace matching parser
    const jsonStr = extractJSON(responseText);
    const parsed = JSON.parse(jsonStr);
    
    if (!parsed.detectedQuestion) {
      parsed.detectedQuestion = '[Transcribed Voice Question]';
    }
    if (parsed.isCodeOnly === undefined) {
      parsed.isCodeOnly = false;
    }
    if (!parsed.codeBlock) parsed.codeBlock = '';
    if (!parsed.explanation) parsed.explanation = '';
    if (!parsed.keyPoints) parsed.keyPoints = [];
    if (!parsed.sampleAnswer) parsed.sampleAnswer = '';

    if (parsed.isCodeOnly && !parsed.codeBlock) {
      parsed.codeBlock = parsed.explanation;
    }
    
    return parsed;
  } catch (error) {
    console.error('Error in geminiService audio endpoint:', error);
    throw new Error(error.message || 'Failed to generate answer from Gemini AI audio.');
  }
};
