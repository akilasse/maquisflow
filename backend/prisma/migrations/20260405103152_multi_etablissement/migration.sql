/*
  Warnings:

  - You are about to drop the column `maquis_id` on the `utilisateur` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `utilisateur` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `utilisateur` DROP FOREIGN KEY `Utilisateur_maquis_id_fkey`;

-- AlterTable
ALTER TABLE `maquis` ADD COLUMN `type` ENUM('maquis', 'restaurant') NOT NULL DEFAULT 'maquis';

-- AlterTable
ALTER TABLE `utilisateur` DROP COLUMN `maquis_id`,
    DROP COLUMN `role`;

-- CreateTable
CREATE TABLE `UtilisateurMaquis` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `utilisateur_id` INTEGER NOT NULL,
    `maquis_id` INTEGER NOT NULL,
    `role` ENUM('caissier', 'gerant', 'patron') NOT NULL DEFAULT 'caissier',
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UtilisateurMaquis_utilisateur_id_maquis_id_key`(`utilisateur_id`, `maquis_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UtilisateurMaquis` ADD CONSTRAINT `UtilisateurMaquis_utilisateur_id_fkey` FOREIGN KEY (`utilisateur_id`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UtilisateurMaquis` ADD CONSTRAINT `UtilisateurMaquis_maquis_id_fkey` FOREIGN KEY (`maquis_id`) REFERENCES `Maquis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
