import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Ensure you have GOOGLE_API_KEY set in your .env file for the googleAI plugin.
// The plugin needs this for initialization, even if a specific flow doesn't use an AI model.
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
