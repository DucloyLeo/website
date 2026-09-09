// ─── Configuration Supabase ───────────────────────────
// Deux projets Supabase distincts : un pour la prod (tangoleo.fr / www),
// un pour le dev/preview — pour que tester sur `dev` n'écrive jamais dans
// les données publiques (comptes, scores, boutique...).
// Tant que SUPABASE_URL_DEV n'est pas renseigné (projet pas encore créé
// côté Supabase), le dev retombe automatiquement sur les identifiants de
// prod pour ne rien casser.
const SUPABASE_URL_PROD      = 'https://erukrlfuuivrdtlidodj.supabase.co';
const SUPABASE_ANON_KEY_PROD = 'sb_publishable_b4b4DqfMAx1V2Df6nYAMOw_ZYFr_xwz';

const SUPABASE_URL_DEV       = 'https://dojvvtyjvshnckrftgau.supabase.co';
const SUPABASE_ANON_KEY_DEV  = 'sb_publishable_22oHxr_i6NIDXx4yuAL4EA_Ri6GB379';

const PROD_HOSTS = ['tangoleo.fr', 'www.tangoleo.fr'];
const _isProdHost = PROD_HOSTS.includes(window.location.hostname);
const _useDevCreds = !_isProdHost && SUPABASE_URL_DEV && SUPABASE_ANON_KEY_DEV;

const SUPABASE_URL      = _useDevCreds ? SUPABASE_URL_DEV      : SUPABASE_URL_PROD;
const SUPABASE_ANON_KEY = _useDevCreds ? SUPABASE_ANON_KEY_DEV : SUPABASE_ANON_KEY_PROD;

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
