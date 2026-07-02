-- update_users.sql
-- =====================================================
-- METTRE À JOUR LES UTILISATEURS AVEC BONS HASH
-- =====================================================

-- Voir les utilisateurs actuels
SELECT '📋 UTILISATEURS ACTUELS :' as " ";
SELECT id, username, password_hash, email, role FROM utilisateurs;

-- Supprimer les anciens utilisateurs
TRUNCATE TABLE utilisateurs CASCADE;
ALTER SEQUENCE utilisateurs_id_seq RESTART WITH 1;

-- ✅ Insérer avec les bons hash
INSERT INTO utilisateurs (username, password_hash, nom, prenom, role, email, actif) VALUES
('chef.baf', '$2a$10$2fc/qvKCXRtftf1mEOxn4uOyJxHcIx63uTl.mkHnhYBLfVnH5cDuW', 'Rakoto', 'Andoniaina', 'Chef BAF', 'chef.baf@budget.mg', true),
('agent.comptable', '$2a$10$.eZPQqPf.4xRFpZGxeOmxuXICtiqN8g0.rm.GGKCbzSZjClrmNJO.', 'Rabe', 'Marie', 'Agent Comptable', 'agent.comptable@budget.mg', true),
('chef.srb', '$2a$10$zp7fPOdreFExNZmxp9UQBe/ymftUaGNxF2kdkBFPwVQyb4ENPEu9C', 'Razafy', 'Jean', 'Chef SRB', 'chef.srb@budget.mg', true),
('admin', '$2a$10$20QtZTEvAytPycBI3Yzf1.v6ePCZqnxA.frsh3qZkR0iMCQpWyHRC', 'Admin', 'System', 'Administrateur', 'admin@budget.mg', true);

-- Vérifier les utilisateurs insérés
SELECT '✅ UTILISATEURS INSÉRÉS :' as " ";
SELECT id, username, password_hash, email, role FROM utilisateurs;

-- Vérification supplémentaire
SELECT '📊 RÉSUMÉ :' as " ";
SELECT 
    COUNT(*) as "Total utilisateurs",
    (SELECT COUNT(*) FROM utilisateurs WHERE role = 'Chef BAF') as "Chefs BAF",
    (SELECT COUNT(*) FROM utilisateurs WHERE role = 'Agent Comptable') as "Agents Comptables",
    (SELECT COUNT(*) FROM utilisateurs WHERE role = 'Chef SRB') as "Chefs SRB",
    (SELECT COUNT(*) FROM utilisateurs WHERE role = 'Administrateur') as "Administrateurs";

-- Test de connexion pour chef.baf
SELECT '🔑 TEST DE CONNEXION :' as " ";
SELECT 
    username,
    CASE 
        WHEN username = 'chef.baf' THEN 'Mot de passe: password123'
        WHEN username = 'agent.comptable' THEN 'Mot de passe: password123'
        WHEN username = 'chef.srb' THEN 'Mot de passe: password123'
        WHEN username = 'admin' THEN 'Mot de passe: admin123'
    END as "Mot de passe",
    role as "Rôle"
FROM utilisateurs
WHERE username IN ('chef.baf', 'agent.comptable', 'chef.srb', 'admin');

-- Message final
SELECT '✅ MISE À JOUR TERMINÉE AVEC SUCCÈS !' as " ";
SELECT '🔑 IDENTIFIANTS DE TEST :' as " ";
SELECT 'chef.baf / password123' as "Utilisateur 1";
SELECT 'agent.comptable / password123' as "Utilisateur 2";
SELECT 'chef.srb / password123' as "Utilisateur 3";
SELECT 'admin / admin123' as "Utilisateur 4";