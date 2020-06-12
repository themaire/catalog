<?php
	include("const.php");
	include("lib/fonctions/fonctions.php");
  
	addBdd('models');
	exec("mysql --user=root --password=" . DBPASSWD . "--database=lib3d -e 'delete from fichiers where fi_nom like '._%'";);
	delBdd(); 

?>
