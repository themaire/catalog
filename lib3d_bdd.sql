-- phpMyAdmin SQL Dump
-- version 4.9.2
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost
-- Généré le :  sam. 30 mai 2020 à 23:09
-- Version du serveur :  10.3.21-MariaDB
-- Version de PHP :  5.6.40

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données :  `lib3d`
--
CREATE DATABASE IF NOT EXISTS `lib3d` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
USE `lib3d`;

DELIMITER $$
--
-- Procédures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `effacer` ()  BEGIN
    SET FOREIGN_KEY_CHECKS = 0;
	TRUNCATE table lib3d.stl;
    TRUNCATE table lib3d.fichiers;
	SET FOREIGN_KEY_CHECKS = 1;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Structure de la table `fichiers`
--

CREATE TABLE `fichiers` (
  `fi_id` int(10) UNSIGNED NOT NULL,
  `stl_id` int(10) UNSIGNED NOT NULL,
  `fi_nom` text NOT NULL,
  `fi_path` text NOT NULL,
  `lib_id_type` int(10) UNSIGNED NOT NULL,
  `fi_taille` float DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `fichiers_stl`
-- (Voir ci-dessous la vue réelle)
--
CREATE TABLE `fichiers_stl` (
`nom` text
,`taille` float
,`type` text
,`id_categorie` int(11)
,`chemin` mediumtext
,`stl_id` int(10) unsigned
);

-- --------------------------------------------------------

--
-- Structure de la table `libelles`
--

CREATE TABLE `libelles` (
  `lib_id` int(10) UNSIGNED NOT NULL,
  `lib_nom` text NOT NULL,
  `lib_nom_id` int(11) NOT NULL,
  `lib_free` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Déchargement des données de la table `libelles`
--

INSERT INTO `libelles` (`lib_id`, `lib_nom`, `lib_nom_id`, `lib_free`) VALUES
(1, 'http://mydomain.com', 2, NULL),
(2, 'thingiverse', 0, 1),
(3, 'perso', 0, 1),
(6, 'jpeg', 1, NULL),
(7, 'jpg', 1, NULL),
(8, 'png', 1, NULL),
(9, 'stl', 1, NULL),
(10, 'txt', 1, NULL),
(11, 'url', 1, NULL),
(12, 'html', 1, NULL),
(13, 'pdf', 1, NULL),
(14, 'gcode', 1, NULL),
(15, 'zip', 1, NULL),
(16, 'rar', 1, NULL),
(17, 'gif', 1, NULL),
(18, 'obj', 1, NULL),
(19, '7z', 1, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `libelles_noms`
--

CREATE TABLE `libelles_noms` (
  `lib_nom_id` int(10) UNSIGNED NOT NULL,
  `lib_nom_nom` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Déchargement des données de la table `libelles_noms`
--

INSERT INTO `libelles_noms` (`lib_nom_id`, `lib_nom_nom`) VALUES
(0, 'categorie'),
(1, 'extension'),
(2, 'hostname');

-- --------------------------------------------------------

--
-- Structure de la table `stl`
--

CREATE TABLE `stl` (
  `stl_id` int(10) UNSIGNED NOT NULL,
  `stl_nom` text NOT NULL,
  `stl_date_ajout` date DEFAULT current_timestamp(),
  `lib_id_categorie` int(11) DEFAULT NULL,
  `stl_path` text NOT NULL,
  `stl_nb_dl` int(11) DEFAULT NULL,
  `stl_printed` tinyint(1) DEFAULT NULL,
  `stl_observations` text DEFAULT NULL,
  `stl_thumbnail` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Structure de la vue `fichiers_stl`
--
DROP TABLE IF EXISTS `fichiers_stl`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `fichiers_stl`  AS  select `fi`.`fi_nom` AS `nom`,`fi`.`fi_taille` AS `taille`,`lib`.`lib_nom` AS `type`,`st`.`lib_id_categorie` AS `id_categorie`,concat(`st`.`stl_path`,'/',`st`.`stl_nom`,'/',`fi`.`fi_path`,case when `fi`.`fi_path` = '' then '' else '/' end,`fi`.`fi_nom`) AS `chemin`,`st`.`stl_id` AS `stl_id` from ((`fichiers` `fi` left join `stl` `st` on(`st`.`stl_id` = `fi`.`stl_id`)) left join `libelles` `lib` on(`fi`.`lib_id_type` = `lib`.`lib_id`)) ;

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `fichiers`
--
ALTER TABLE `fichiers`
  ADD PRIMARY KEY (`fi_id`),
  ADD KEY `fk_stl` (`stl_id`);

--
-- Index pour la table `libelles`
--
ALTER TABLE `libelles`
  ADD PRIMARY KEY (`lib_id`),
  ADD UNIQUE KEY `lib_id` (`lib_id`);

--
-- Index pour la table `libelles_noms`
--
ALTER TABLE `libelles_noms`
  ADD UNIQUE KEY `lib_nom_id` (`lib_nom_id`);

--
-- Index pour la table `stl`
--
ALTER TABLE `stl`
  ADD PRIMARY KEY (`stl_id`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `fichiers`
--
ALTER TABLE `fichiers`
  MODIFY `fi_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `libelles`
--
ALTER TABLE `libelles`
  MODIFY `lib_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT pour la table `libelles_noms`
--
ALTER TABLE `libelles_noms`
  MODIFY `lib_nom_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `stl`
--
ALTER TABLE `stl`
  MODIFY `stl_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `fichiers`
--
ALTER TABLE `fichiers`
  ADD CONSTRAINT `fk_stl` FOREIGN KEY (`stl_id`) REFERENCES `stl` (`stl_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
