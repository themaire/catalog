<?php
  

  define('dbDefault', 'lib3d');
  define('DBUSER', 'root');
  include("/var/www/html/catalog/database_root_password.php");
  define('DBPORT', 3306);
//  define('DBHOST', '127.0.0.1'); // Synology
  define('DBHOST', 'localhost'); // Like Raspberry Pi

  define('DIFF', 0);
  define('TMP', "tmp/");
  define('TMPIMG', TMP . "img/");
  define('BASEDIR3D', '/var/www/html/catalog/'); // catalog's root

?>
