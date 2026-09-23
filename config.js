// ============================================================================
// Fill these two values in after you create your Supabase project:
//   Supabase Dashboard → Project Settings → API
//     - "Project URL"       → SUPABASE_URL
//     - "anon public" key   → SUPABASE_ANON_KEY
// This file is safe to be public — the anon key is meant to be used in the
// browser (all real security is enforced by the RLS policies in schema.sql).
// ============================================================================
const SUPABASE_URL = "https://tughempetbyleshlzupu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1Z2hlbXBldGJ5bGVzaGx6dXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwOTc5ODksImV4cCI6MjEwNTY3Mzk4OX0.w7jlQJnjzP1aMn4yxzpUr5MkWT6TQ7bVzhZrOGUedQM";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
