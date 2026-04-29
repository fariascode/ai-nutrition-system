// OpenAI calls go through a Supabase Edge Function to keep the API key server-side.
// This file exports the helper that invokes that function.
export const OPENAI_FUNCTION_NAME = 'generate-nutrition-plan'
