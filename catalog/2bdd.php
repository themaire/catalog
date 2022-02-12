<?php
	include("const.php");
	include("lib/fonctions/fonctions.php");
  
	$stlDirectory = 'models';	

	// Empècher le scan si le dossier de base des STLs VIDE. Pour empêcher l'effacement complet de la BDD.
	$dir = scanDoss($stlDirectory);

	if(count($dir) != 0){
		addBdd($stlDirectory);
		$garbageFichier="mysql --user=root --password='" . DBPASSWD . "' --database=lib3d -e \"delete from fichiers where fi_nom like '._%' or fi_nom like '%/._%';\"";
		$garbageSTL="mysql --user=root --password='" . DBPASSWD . "' --database=lib3d -e \"delete from stl where stl_nom like '._%';\"";
		//echo($garbageQuery);
		exec($garbageFichier);
		exec($garbageSTL);
		delBdd();
	}
	//else{ Prevenir ???}

?>
