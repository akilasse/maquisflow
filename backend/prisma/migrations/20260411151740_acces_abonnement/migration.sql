-- AlterTable
ALTER TABLE `abonnement` ADD COLUMN `bloque` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `periodicite` ENUM('mensuel', 'annuel') NULL,
    ADD COLUMN `type_acces` ENUM('achat_unique', 'abonnement') NOT NULL DEFAULT 'abonnement',
    MODIFY `statut` ENUM('actif', 'expire', 'suspendu', 'essai') NOT NULL DEFAULT 'essai',
    MODIFY `date_echeance` DATETIME(3) NULL;
