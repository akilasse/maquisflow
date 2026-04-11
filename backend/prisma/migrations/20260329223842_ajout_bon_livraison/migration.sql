-- CreateTable
CREATE TABLE `BonLivraison` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `maquis_id` INTEGER NOT NULL,
    `fournisseur_id` INTEGER NULL,
    `date_livraison` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `note` TEXT NULL,
    `total_achat` DECIMAL(10, 2) NOT NULL,
    `cree_par` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BonLivraisonLigne` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bon_id` INTEGER NOT NULL,
    `produit_id` INTEGER NOT NULL,
    `quantite` DECIMAL(10, 3) NOT NULL,
    `prix_achat` DECIMAL(10, 2) NOT NULL,
    `total_ligne` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BonLivraison` ADD CONSTRAINT `BonLivraison_maquis_id_fkey` FOREIGN KEY (`maquis_id`) REFERENCES `Maquis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BonLivraison` ADD CONSTRAINT `BonLivraison_fournisseur_id_fkey` FOREIGN KEY (`fournisseur_id`) REFERENCES `Fournisseur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BonLivraisonLigne` ADD CONSTRAINT `BonLivraisonLigne_bon_id_fkey` FOREIGN KEY (`bon_id`) REFERENCES `BonLivraison`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BonLivraisonLigne` ADD CONSTRAINT `BonLivraisonLigne_produit_id_fkey` FOREIGN KEY (`produit_id`) REFERENCES `Produit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
