// ─── Configuration Supabase ───────────────────────────
// Remplacez ces valeurs par celles de votre projet Supabase
// Dashboard → Settings → API
const SUPABASE_URL      = 'VOTRE_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'VOTRE_SUPABASE_ANON_KEY';

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
