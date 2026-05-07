-- Migration : Fusionner statut 'validee' → 'encaissee'
-- 1. Migrer les données d'abord (obligatoire avant modification de l'enum MySQL)
UPDATE `Vente` SET `statut` = 'encaissee' WHERE `statut` = 'validee';

-- 2. Supprimer 'validee' de l'enum
ALTER TABLE `Vente` MODIFY `statut` ENUM('en_attente', 'encaissee', 'annulee', 'credit_en_cours') NOT NULL DEFAULT 'encaissee';
