/*
  Warnings:

  - Added the required column `prix_catalogue` to the `VenteLigne` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `venteligne` ADD COLUMN `economie_client` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `prix_catalogue` DECIMAL(10, 2) NOT NULL;
