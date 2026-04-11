-- AlterTable
ALTER TABLE `stockmouvement` ADD COLUMN `fournisseur_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `Fournisseur` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maquis_id` INTEGER NOT NULL,
    `nom` VARCHAR(150) NOT NULL,
    `telephone` VARCHAR(20) NULL,
    `email` VARCHAR(150) NULL,
    `adresse` VARCHAR(255) NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StockMouvement` ADD CONSTRAINT `StockMouvement_fournisseur_id_fkey` FOREIGN KEY (`fournisseur_id`) REFERENCES `Fournisseur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Fournisseur` ADD CONSTRAINT `Fournisseur_maquis_id_fkey` FOREIGN KEY (`maquis_id`) REFERENCES `Maquis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
