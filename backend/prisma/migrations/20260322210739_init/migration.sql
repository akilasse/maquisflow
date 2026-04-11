-- CreateTable
CREATE TABLE `Maquis` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nom` VARCHAR(100) NOT NULL,
    `logo_url` VARCHAR(255) NULL,
    `couleur_primaire` VARCHAR(7) NULL,
    `devise` VARCHAR(10) NOT NULL DEFAULT 'XOF',
    `fuseau_horaire` VARCHAR(50) NOT NULL DEFAULT 'Africa/Abidjan',
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Utilisateur` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maquis_id` INTEGER NOT NULL,
    `nom` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `mot_de_passe` VARCHAR(255) NOT NULL,
    `role` ENUM('caissier', 'gerant', 'patron') NOT NULL DEFAULT 'caissier',
    `actif` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Utilisateur_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Produit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maquis_id` INTEGER NOT NULL,
    `nom` VARCHAR(150) NOT NULL,
    `categorie` VARCHAR(80) NULL,
    `prix_vente` DECIMAL(10, 2) NOT NULL,
    `prix_achat` DECIMAL(10, 2) NOT NULL,
    `stock_actuel` DECIMAL(10, 3) NOT NULL,
    `stock_min` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `unite` VARCHAR(20) NOT NULL DEFAULT 'unité',
    `actif` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vente` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maquis_id` INTEGER NOT NULL,
    `caissier_id` INTEGER NOT NULL,
    `date_vente` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `total_brut` DECIMAL(10, 2) NOT NULL,
    `remise_globale` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `total_net` DECIMAL(10, 2) NOT NULL,
    `mode_paiement` ENUM('especes', 'wave', 'orange_money', 'mtn_money', 'credit') NOT NULL,
    `statut` ENUM('validee', 'annulee', 'credit_en_cours') NOT NULL DEFAULT 'validee',
    `valide_par` INTEGER NULL,
    `note` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VenteLigne` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vente_id` INTEGER NOT NULL,
    `produit_id` INTEGER NOT NULL,
    `quantite` DECIMAL(10, 3) NOT NULL,
    `prix_unitaire` DECIMAL(10, 2) NOT NULL,
    `remise_ligne` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `total_ligne` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockMouvement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maquis_id` INTEGER NOT NULL,
    `produit_id` INTEGER NOT NULL,
    `type_mouvement` ENUM('entree', 'sortie_vente', 'sortie_manuelle', 'ajustement') NOT NULL,
    `quantite` DECIMAL(10, 3) NOT NULL,
    `raison` VARCHAR(255) NULL,
    `utilisateur_id` INTEGER NOT NULL,
    `date_mouvement` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `valide_par` INTEGER NULL,
    `valide_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inventaire` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maquis_id` INTEGER NOT NULL,
    `date_debut` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `date_fin` DATETIME(3) NULL,
    `statut` ENUM('en_cours', 'cloture') NOT NULL DEFAULT 'en_cours',
    `cree_par` INTEGER NOT NULL,
    `cloture_par` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventaireLigne` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventaire_id` INTEGER NOT NULL,
    `produit_id` INTEGER NOT NULL,
    `qte_theorique` DECIMAL(10, 3) NOT NULL,
    `qte_reelle` DECIMAL(10, 3) NOT NULL,
    `ecart` DECIMAL(10, 3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LogAction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maquis_id` INTEGER NOT NULL,
    `utilisateur_id` INTEGER NOT NULL,
    `type_action` VARCHAR(80) NOT NULL,
    `description` TEXT NULL,
    `date_action` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip_client` VARCHAR(45) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Utilisateur` ADD CONSTRAINT `Utilisateur_maquis_id_fkey` FOREIGN KEY (`maquis_id`) REFERENCES `Maquis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Produit` ADD CONSTRAINT `Produit_maquis_id_fkey` FOREIGN KEY (`maquis_id`) REFERENCES `Maquis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vente` ADD CONSTRAINT `Vente_maquis_id_fkey` FOREIGN KEY (`maquis_id`) REFERENCES `Maquis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vente` ADD CONSTRAINT `Vente_caissier_id_fkey` FOREIGN KEY (`caissier_id`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VenteLigne` ADD CONSTRAINT `VenteLigne_vente_id_fkey` FOREIGN KEY (`vente_id`) REFERENCES `Vente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VenteLigne` ADD CONSTRAINT `VenteLigne_produit_id_fkey` FOREIGN KEY (`produit_id`) REFERENCES `Produit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMouvement` ADD CONSTRAINT `StockMouvement_maquis_id_fkey` FOREIGN KEY (`maquis_id`) REFERENCES `Maquis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMouvement` ADD CONSTRAINT `StockMouvement_produit_id_fkey` FOREIGN KEY (`produit_id`) REFERENCES `Produit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMouvement` ADD CONSTRAINT `StockMouvement_utilisateur_id_fkey` FOREIGN KEY (`utilisateur_id`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inventaire` ADD CONSTRAINT `Inventaire_maquis_id_fkey` FOREIGN KEY (`maquis_id`) REFERENCES `Maquis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventaireLigne` ADD CONSTRAINT `InventaireLigne_inventaire_id_fkey` FOREIGN KEY (`inventaire_id`) REFERENCES `Inventaire`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventaireLigne` ADD CONSTRAINT `InventaireLigne_produit_id_fkey` FOREIGN KEY (`produit_id`) REFERENCES `Produit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogAction` ADD CONSTRAINT `LogAction_maquis_id_fkey` FOREIGN KEY (`maquis_id`) REFERENCES `Maquis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogAction` ADD CONSTRAINT `LogAction_utilisateur_id_fkey` FOREIGN KEY (`utilisateur_id`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
