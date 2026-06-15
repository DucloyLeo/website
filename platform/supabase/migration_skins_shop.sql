-- ═══════════════════════════════════════════════════
--  Migration : Ajouter les skins à la boutique
-- ═══════════════════════════════════════════════════

-- Ajouter les 6 skins payants à shop_items
INSERT INTO shop_items (id, name, description, icon, type, item_key, cost, unlock_level, is_active, sort_order) VALUES
  ('skin-circles', 'Ronds colorés',
   'Symboles circulaires colorés : rouge et bleu.',
   '🔴', 'skin', 'circles', 500, NULL, true, 20),

  ('skin-cards1', 'Cartes #1',
   'Cartes à jouer : Cœur et Pique.',
   '❤', 'skin', 'cards1', 750, NULL, true, 21),

  ('skin-cards2', 'Cartes #2',
   'Cartes à jouer : Carreau et Trèfle.',
   '♦', 'skin', 'cards2', 750, NULL, true, 22),

  ('skin-skull', 'Amour & Mort',
   'Thème contraste : Cœur et Tête de mort.',
   '❤', 'skin', 'skull', 1000, NULL, true, 23),

  ('skin-tictactoe', 'TicTacToe',
   'Symboles de jeu : Cercle et Croix.',
   '🔵', 'skin', 'tictactoe', 1000, NULL, true, 24),

  ('skin-fruits', 'Fruits',
   'Fruits amusants : Pomme et Banane.',
   '🍎', 'skin', 'fruits', 1250, NULL, true, 25)

ON CONFLICT (id) DO UPDATE SET
  cost = EXCLUDED.cost,
  unlock_level = EXCLUDED.unlock_level,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;
