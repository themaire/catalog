<?php

  define('dbDefault', 'lib3d');
  define('DIFF', 0);
  define('TMP', "tmp/");
  define('TMPIMG', TMP . "img/");
  require('lib/fonctions/generiques.php');

  function selectId($table, $id_field, $where_field, $path, $depth = 2 + DIFF){
    // retourne la clé de l'élément cherché.
    $fieldName = $id_field;
    $field = array($fieldName => null);
    $where = array($where_field => explode("/", $path)[$depth]);
    $query = simpleSelect($field, $table, $where);
    $data = array("data" => $query['data'][0][$fieldName], "erreur" => $query['erreur']);
    return $data;
  }

  function selectIdType($table, $id_field, $where_field, $path){
    // retourne la clé de l'extension du fichier donné.
    $extension = pathinfo($path)['extension'];
    $fieldName = $id_field;
    $field = array($fieldName => null);
    $where = array($where_field => $extension);
    $query = simpleSelect($field, $table, $where);
    $data = array("data" => $query['data'][0][$fieldName], "erreur" => $query['erreur']);
    return $data;
  }

  function getIdStlFile($item){
    // Retourne un stl_id depuis l'item ( un chemin de fichier ).
    $id_stl = selectId("stl", "stl_id", "stl_nom", $item)['data'];
    return ($id_stl == null) ? selectId("stl", "stl_id", "stl_nom", $item, 3 + DIFF)['data'] : $id_stl;
    //if($id_stl = selectId("stl", "stl_id", "stl_nom", $item)['data'] !== null) $id_stl = selectId("stl", "stl_id", "stl_nom", $item, 3)['data'];
    //return $id_stl;
  }

  function lastElem($path, $delem = "/"){
    $array = explode($delem, $path);
    $nb = count($array);
    if($nb > 0){
      return $array[$nb - 1];
    }else{
      return false;
    } 
  }

  function archiveInPath($path){
    // indique si $path est une archive
    // Retoune zip ou rar
    $element = explode("/", $path);
    $found = false;
    foreach ($element as $value) {
      $lastElem = lastElem($value, ".");
      if($lastElem == "zip" || $lastElem == "rar"){
        if(isset($_GET["debug"])){
          echo "Un $lastElem dans le chemin<br>";
        }
        return $lastElem;
      }
    }
    return $found;
  }

  function selectFile($path){
    // retourne un array
    // la clé du fichier si il existe dans la table ET le chemin du fichier dans le dossier ou archive STL.

    echo 'The path ' . $path . "<br>";
    $archivePath = archiveInPath($path);

    $wholePath = explode("/", $path); // Copie du $path qui ne sera pas altéré par les array_pop()
    $path = explode("/", $path); // Coupe du $path du fichier en question en array
    $file = array_pop($path); // On prend le dernier élément de $path pour le mettre dans $name ($path se retrouve raccourci de ce morceau)

    $depth = 2 + DIFF;
    $depthPath = $depth - 1;

    if(!$archivePath){ // Il s'agirait PAS du chemin d'une archive
      $content = scanDoss(implodePath($path,2)); // Contenu du dossier /stls/THEME/...
      // Détermination position du nom du dossier stl de base (si il y a uniqumeent un dossier dans le dossier de base)
      if(count($content) == 1 && count($path) >= 4 && (is_dir(implodePath($path,3)) || file_exists(implodePath($path,3) . "/" . $file))){
        $depth = 3 + DIFF;
        $depthPath = $depth - 1 ;
        echo "ouais depth = $depth car count content = " . count($content) . ' et is_dir(' . implodePath($path,$depth) . ') = ' . is_dir(implodePath($path,$depth)) . "<br>
        OU file_exists(" . implodePath($path,$depth) . "/" . $file . ") " . file_exists(implodePath($path,$depth) . '/' . $file) . "<<br>";
      }
    }

    //$path = explode('/',implodePath($path, $depthStl));
    echo "le depth = $depth<br>";
    echo "le on est est où path?? = " . implode('/',$path) . "<br>";

    $stlName = $path[$depth]; // Extraire la famille de STLs
    if($stlName == ''){
      echo "</br>selectFile() stlName = $stlName  ----  path = implode('/', " . implode("/", $path) . ")<br>";
    }

    $pathStl = implodePath($path, $depthPath);
    echo "pathStl = $pathStl<br>";
    $pathFile = array_diff($wholePath, explode("/",implodePath($path,$depth)));
    echo "pathFile = " . implode("/", $pathFile) . "<br>";

    array_pop($pathFile);
    $pathFile = implode("/", $pathFile); // Chemin du fichier APRES le nom du STL.
    echo "pathFile = " . $pathFile . "<br>";

    // Dans le cas d'une archive, pour tester si le fichier existe, on doit coller le fi_path au fi_name Uniquement si la longueur de fi_path > 1
    $file = ($archivePath != false and $pathFile != "") ? $pathFile . "/" . $file : $file;
    // echo 'count($pathFile) ' . count($pathFile) . "<br>"; 
    // echo "pathFile = " . $pathFile . " --- file = " . $file .  "<br>";
    // var_dump($pathFile);
    // echo "<br>";

    // On test si le fichier courrant existe
    $fieldName = 'fi_id';
    $field = array($fieldName => null);
    $where = array("fi_nom" => $file, "stl_nom" => $stlName, "stl_path" => $pathStl);
    $join = array("stl" => "st.stl_id = fi.stl_id");

    $result = simpleSelect($field, 'fichiers', $where, $join);
    if(!$result['erreur']){ // Si requete OK
      echo "DATA selectFile() [" . $result['data'][0][$fieldName] . "] >> $file - $depth - $stlName - $pathStl<br>";
      //exit();
      return array("data" => $result['data'][0][$fieldName], "pathFile" => $pathFile);
    }else{
      echo $result['debug'];
    }

  }

  function implodePath($pathArray, $depth = 1){
    // Reconstruit un PATH depuis un PATH précedement coupé en array mais jusqu'a une certaine longueur.
    // $pathArray un PATH explosé avec la fonction explode('/', $array)
    // $depth : jusqu'a quelle profondeur doit on reconstituer le PATH
    // retourne un string

    $newPath = array();
    for($i = 0; $i <= $depth; $i++){
      $newPath[] = $pathArray[$i];
    }
    return implode("/", $newPath);
  }

  function fileProcessing($item, $elem, $size = null){
    // Prend en parametre le chemin complet de l'élément ($item) ainsi que son nom ($elem).
    // S'occupe de verifier si pas déja dans la table fichier. Enregistre en base si necessaire.

    $testAlready = selectFile($item); // Retourne le fi_id si existe déja

    if(isset($_GET["debug"])){
	    if(!is_null($testAlready["data"])){
	      echo $elem . " existe deja (fi_id = " . $testAlready['data'] . ").<br>";
	    }else{
	      echo $elem . " n'existe pas encore nous allons l'insert dans la table fichier.<br>";
    	}
    }

    $id_type = selectIdType("libelles", "lib_id", "lib_nom", $item)['data'];
    if($testAlready["data"] == null && $id_type != null){ // Insert le fichier si il n'est pas déja trouvé en base ET si l'extension est connu : on insert.

      if(is_file($item)){ // C'est un fichier on peut mesurer sa taille
        $size = filesize($item);
      }

      $id_stl = getIdStlFile($item);
      $data = array("stl_id" => $id_stl, "fi_nom" => $elem, "fi_path" => $testAlready["pathFile"], "lib_id_type" => $id_type, "fi_taille" => $size);
      if(isset($_GET["debug"])){
        echo 'Rangement du fichiers. Nom : ' . $elem . "<br>";
        echo "DATA fichier:<br>";
        foreach ($data as $key => $value) {
          echo "$key => $value<br>";
        }
      }
      $state = insert('fichiers', $data);
      echo "Insert du fichier  " . $item . '. Last id = ' . $state["data"] . "<br>";
    }
  }

  function shift($path, $nb){
    // Dépile un chemin par le debut autant de fois que necessaire
    // Utile pour retirer /volume1/3d/   de /volume1/3d/models/divers
    //    Si $nb = 2         1er   2eme
    $path = substr($path, 1);
    $array = explode("/", $path);
    for($i = 0; $i < $nb; $i++){
      array_shift($array);
    }
    $newPath = implode("/", $array);
    return $newPath;
  }

  function stlProcessing($dossier, $explotem, $item, $elem, $depth){
    // Prend en parametre le chemin complet de l'élément ($item) ainsi que son nom ($elem).
    // S'occupe de verifier si pas déja dans la table stl. Enregistre en base si necessaire.
    $testAlready = selectId("stl", "stl_id", "stl_nom", $item, count($explotem) - 1);
    if(isset($_GET["debug"])){
      echo "testAlready = " . $testAlready["data"]."<br>";
    }
    if($depth > 0 && is_null($testAlready['data'])){
      $id_categorie = selectId("libelles", "lib_id", "lib_nom", $item, 1 + DIFF)['data'];
      $data = array("stl_nom" => $elem, "stl_path" => $dossier, "lib_id_categorie" => $id_categorie);
      if(isset($_GET["debug"])){
        echo 'Rangement du STL. Nom : ' . $elem . "<br>";
        echo "DATA STL :<br>";
        foreach ($data as $key => $value) {
          echo "$key => $value<br>";
        }
      }
      $state = insert('stl', $data);
      if(isset($_GET["debug"])){
        echo "Insert du stl " . $item . '. Last id = ' . $state["data"] . "<br>";
      }
    }else{
      if(isset($_GET["debug"])){
        echo $item . " exist ( ID : " . $testAlready["data"] . ").<br><br>";
      }
    }
    echo "<br>";
  }

  function openZip($item){
    // Ouvre un Zip
    // return : un array contenant le chemin de tous les fichiers à l'interieur
    $zip = new ZipArchive;
    if ($zip->open($item) == TRUE) {
      $files = array();
      for($i = 0; $i < $zip->numFiles; $i++){
        if(substr($zip->getNameIndex($i), -1) != "/" || $i[0] != "."){
          $files[$i]['name'] = trim($zip->getNameIndex($i));
          $files[$i]['size'] = $zip->statIndex($i)['size'];
          if(isset($_GET["debug"])){
            echo "fichier : " . trim($zip->getNameIndex($i)) . " -- Taille = " . $zip->statIndex($i)['size'] . " octets<br>";
          }
        }
      }
    }else{
      return "N'a pas pu ouvrir $item";
    }
    $zip->close();
    return $files;
  }

  function openRar($item){
    // Ouvre un Rar et retourne un array contenant le chemin de tous les fichiers à l'interieur
    // Mais retourne le message d'erreur si besoin
    $cmd = "unrar lb " . '"' . $item . '"';
    // echo "Command : $cmd<br>";
    exec($cmd, $output);
    // echo "Ouverture du RAR $item <<<<<<<<<<<br>";

    $files = array();
    $cpt = 0;
    foreach ($output as $value) {
      if(getExt($value  || $i[0] != ".")){ // Prendre uniquement les lignes qui sont des vrais noms de fichiers
        // echo "fichier : $value<br>";
        $files[$cpt]['name'] = $value;

        $fi_path = ($testAlready["pathFile"] != "") ? $testAlready["pathFile"] . '/' : "";
        $cutfield = 4;
        $cmd = 'unrar lt "' . $item . '" "' . $value . '" | grep "size" | cut -d " " -f ' . $cutfield;
        $size = intval(exec($cmd, $output));
        $size = ($size > -1) ? $size : "";

        $files[$cpt]['size'] = $size;

        if(isset($_GET["debug"])){
          echo "cmd = $cmd<br>";
          echo "size = $size<br>";
        }

      }
      $cpt++;
    }
    return $files;
  }

  function archiveProcessing($type, $item, $elem){
    $cpt = 0;
    if($type == "zip"){
      $files = openZip($item);
    }else if($type == "rar"){
      $files = openRar($item);
    }

    if(is_array($files)){ // Si nous obtenon bien un array (liste) de fichiers
      foreach($files as $value){
        $itemArchive = trim($item) . "/" . $value['name'];
        if(isset($_GET["debug"])){
          echo "N° $cpt -- Import de " . $itemArchive . "<br>";
        }
        fileProcessing($itemArchive, $value['name'], $value['size']);
        echo "<br>";
        $cpt++ ;
      }
    }else{ // Sinnon afficher le message d'erreur
      echo $file . "<br>";
    }
  }

  function typeItem($item, $ext){
    if(is_dir($item) || $ext == 'zip' || $ext == 'rar'){
      $typeItem = "dossier";
      }else{
      $typeItem = "fichier";
      }
    return $typeItem;
  }

  function addBdd($dossier, $depth = -1){
    // Remplit la base de donnée avec tout ce qui se trouve dans $dossier.
    // Fonction qui parcours récursiement le dossier donné en paramètre.
    // .. ! Cette fonction est récusrive car elle s'appelle elle-meme dans
    // .. ! le cas où elle se heurte à un dossier pour le parcourir lui aussi.
    $added = array();

    if(isset($_GET["debug"])){
      echo '<<<<<<<<======= addBdd(' . $dossier . ',' . $depth . ').<br>';
    }
    $depth++ ; // profondeur dans l'arbo.

    $dir = scanDoss($dossier);
    if(isset($_GET["debug"])){
      echo "count(dans $dossier) = " . count($dir) ."<br>";
    }

    foreach ($dir as $elem){ // Pour chaque élément de $dir où $elem est l'élément courrant
      $item = $dossier . '/' . $elem; // Construction du chemin de l'item
      $ext = getExt($item);
      $typeItem = typeItem($item, $ext); // Savoir si dossier|archive OU fichier
      $explotem = explode("/", $item); // L'avoir en mémoire

      if($typeItem == "dossier" && $depth >= 0 && $depth <= 2){ // Si un dossier
        if(is_dir($item)){ // Ok c'est un dossier

          $preTestAlready = selectId("stl", "stl_id", "stl_nom", $item)['data'];
          if($preTestAlready != null){
            if(isset($_GET["debug"])){
              echo "STOP le dossier de base existe en base. stl_id = $preTestAlready<br>";
            }
          }else{
            var_dump($explotem);
            echo "<br>";
            echo "item : $item<br>";
            echo "Le stl " . $explotem[2 + DIFF] . " existe pas.<br>";
            echo "count(explotem) = " . count($explotem) . "<br>";
            echo "<br>";
          }

          if(count($explotem) == 4 + DIFF and $preTestAlready != null){
            echo "Pas la peine on connait deja le stl $explotem[2] en base.<br>";
          }else{
            $content = scanDoss($item);
            echo "Test si 1er truc est LE seul truc : $item" . "/" . $content[0] . "<br>";

            if(count($content) == 1 && is_dir($item . "/" . $content[0])){
              if(isset($_GET["debug"])){
                echo "Je saute puisque le dossier actuel a un seul truc " . " : " . $item . "<br>
                      is_dir($item . '/'' . $content[0]) est visiblement un dossier.<br>";
              }
            }else{ // Cas d'un dossier normal
              stlProcessing($dossier, $explotem, $item, $elem, $depth);
            }
          }
          addBdd($item, $depth); // Re plonger plus profond dans CE sous-dossiers
        }else{
          // Nous sommes dans une archive.
          $testAlready = selectId("stl", "stl_id", "stl_nom", $item, count($explotem) - 1);
          if(is_null($testAlready['data'])){ // Si n'existe pas
            // Ajout de l'archive en tant que STL dans la table STL
            stlProcessing($dossier, $explotem, $item, $elem, $depth);
            // Ajout du contenu de l'archive dans la table fichiers
            archiveProcessing($ext, $item, $elem);
          }else{
          	if(isset($_GET["debug"])){
              echo "Nous connaissons déja cet archive avec l'id : " . $testAlready['data'] . "<br>";
            }
          }
        }
      }else if($typeItem == "fichier"){
        fileProcessing($item, $elem);
      }
    }
    if(isset($_GET["debug"])){
      echo "========>>>>>>> Fin de la fonction addBdd nous quittons le dossier : $dossier <br><br>";
    }else{
      echo "\n<br>";
    }
    echo "<br>";
  }

  function delBdd(){
    $fieldId = 'stl_id';
    $fieldName = 'stl_nom';
    $fieldPath = "stl_path";
    $field = array($fieldId => null, $fieldName => null, $fieldPath => null);
    $listStl = simpleSelect($field, "stl");

    foreach ($listStl["data"] as $key => $value) {
      $path = $value[$fieldPath] . "/" . $value[$fieldName];
      $exist = file_exists($path) ? true : false;

      $deleted = array();
      if($exist == false){
        $where = array($fieldId => $value[$fieldId]);
        delete('stl', $where);
        $message = 'Suppression de "' . $path . '". id_stl = ' . $value[$fieldId];
        _log($message);
        echo $message . "<br>";
      }
    }
  }

  function scanArbo($dossier){
    // Fonction qui parcours récursiement le dossier donné en paramètre.
    // .. ! Cette fonction est récusrive car elle s'appelle elle meme dans
    // .. ! le cas d'un dossier trouvé.
    // Retourne un array.

    // Obtenir la liste des elements du dossier sans le . et le .. .
    $dir = scanDoss($dossier);

    // Création de la liste vide des éléments trouvés
    $liste = array();

    foreach ($dir as $elem){ // Pour chaque élément de $dir où $elem est l'élément courrant
      $item = $dossier . '/' . $elem; // Construction du chemin de l'item
      if(is_dir($item)){ // Si un dossier
        $liste[$elem] = scanArbo($item); // Ranger dans la liste
        // avec nom du dossier en clé et son contenu en valeur.
      }else if(is_file($item)){ // Si fichier
        $liste[] = $elem; // Auto incrémentation de la clé et nom du fichier en valeur.
      }
    }
    return $liste; // Ce qui est retourné en sortie de fonction. Gagné!
  }

?>