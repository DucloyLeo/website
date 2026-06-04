// ─── Configuration Supabase ───────────────────────────
// Remplacez ces valeurs par celles de votre projet Supabase
// Dashboard → Settings → API
const SUPABASE_URL      = 'https://erukrlfuuivrdtlidodj.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'sb_publishable_b4b4DqfMAx1V2Df6nYAMOw_ZYFr_xwz';

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
