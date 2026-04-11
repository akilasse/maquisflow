-- CreateTable
CREATE TABLE `SuperAdmin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `mot_de_passe` VARCHAR(255) NOT NULL,
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SuperAdmin_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Abonnement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maquis_id` INTEGER NOT NULL,
    `montant` DECIMAL(10, 2) NOT NULL DEFAULT 35000,
    `statut` ENUM('actif', 'expire', 'suspendu', 'essai') NOT NULL DEFAULT 'actif',
    `date_debut` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date_echeance` DATETIME(3) NOT NULL,
    `date_paiement` DATETIME(3) NULL,
    `mode_paiement` VARCHAR(50) NULL,
    `reference` VARCHAR(100) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Abonnement_maquis_id_key`(`maquis_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Abonnement` ADD CONSTRAINT `Abonnement_maquis_id_fkey` FOREIGN KEY (`maquis_id`) REFERENCES `Maquis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
