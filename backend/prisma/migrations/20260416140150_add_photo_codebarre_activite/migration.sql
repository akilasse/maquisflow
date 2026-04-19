-- AlterTable
ALTER TABLE `maquis` ADD COLUMN `activite` VARCHAR(100) NULL;

-- AlterTable
ALTER TABLE `produit` ADD COLUMN `code_barre` VARCHAR(100) NULL,
    ADD COLUMN `photo_url` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `utilisateur` ADD COLUMN `photo_url` VARCHAR(255) NULL;
