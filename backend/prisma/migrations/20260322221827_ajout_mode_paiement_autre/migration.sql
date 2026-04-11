-- AlterTable
ALTER TABLE `vente` MODIFY `mode_paiement` ENUM('especes', 'wave', 'orange_money', 'mtn_money', 'credit', 'autre') NOT NULL;
