-- ═══════════════════════════════════════════════════
--  MIGRATION — Confidentialité des profils
--  À exécuter UNE FOIS dans Supabase > SQL Editor
-- ═══════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
