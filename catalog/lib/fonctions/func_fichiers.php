<?php

  function parseFile($file){
    $txt_file = file_get_contents($file);
    $text = explode("# Summary\n\n", $txt_file)[1];
    $text = str_replace("\n", "<br>", $text);
    return $text;
    $rows        = explode("\n", $txt_file);
    array_shift($rows);

    foreach($rows as $row => $data)
    {
        while ($date[0] != "#") {
          continue;
        }
    }
  }

// --
// ---- Pour la liste des STL par categorie
// --

	function images($stl_id){
		// Va prendre la première image des fichiers du stl_id donné.
		$field = array("nom" => null, "type" => null, "chemin" => null, "stl_id" => null);
		$where = array("stl_id" => $stl_id);
		$or = array('type' => array('gif','jpg','png','jpeg'));
		return simpleSelect($field, "fichiers_stl", $where, null, $or)['data'];
	}

    function fichier($stl_id){
		$field = array("nom" => null, "type" => null, "chemin" => null, "chemin" => null, "stl_id" => null);
		$where = array("stl_id" => $stl_id);
		$or = array('type' => array('stl','zip','pdf','gcode'));
		return simpleSelect($field, "fichiers_stl", $where, null, $or)['data'];
	}

	function fileInfo($name){
	    // Utilisée pour récupérer le nom ET l'extension du fichier dans le chamin à l'interieur d'une archive
	    // exemple : garage/outils/visseuse.jpg    récupèrera visseuse.jpg

	    $exlp = explode("/", $name);
	    $file = $exlp[count($exlp) - 1];
	    $expl = explode(".", $file);

		$nom = $expl[0];
	    if(count($expl) == 2){
		    $ext = $expl[1];
	    }else{
		    $ext = "";
	    }
	    return array('name' => $nom . '.' . $ext, 'ext' => $ext );
	}

  function lister($tableau){
    foreach ($tableau as $champ => $value) {
      $strTmp .= $champ . ' : ';
      if($champ == "lib_nom"){
        $strTmp .= ucfirst($value);
      }else{
        $strTmp .= $value;
      }
      $strTmp .= '<br>';
    }
    return $strTmp;
  }

  function showlist($data, $type){
    // Construit la liste des miniatures dans la liste des projets STL
    $strTmp = ucfirst($type) . " : <br>";
    if($type == "stl"){
      $strTmp .= lister($data);
    }else if($type == "fichier"){
      $fichier = $data["data"];
      foreach ($fichier as $champ) {
        $strTmp .= lister($champ);
        $strTmp .= "<br>";
      }
    }
    $strTmp .= "<br>";
    return $strTmp;
  }

  // A faire une fonction qui supprome les STL et les images temporaires si la fonction
  // delBdd() est utilisée

	function zipNdownloadold($stl_name, $liste){
		$zipname = 'TMP' . $stl_name . 'zip';
		$zip = new ZipArchive;
		$zip->open($zipname, ZipArchive::CREATE);

		if(!file_exists($zipname)){ // Eviter d'ajouter des fichier inexistants
			foreach($liste as $elem){
				if(!file_exists($elem['chemin'])){ // Eviter d'ajouter des fichier inexistants
					continue;
				}
				$zip->addFile($elem['chemin'], $elem['chemin']); // Ajout du fichier au zip
			}
			$zip->close();
			echo "j'ai traité " . $zipname;
		}
		header('Content-Type: application/zip');
		header('Content-disposition: attachment; filename='.$zipname);
		header('Content-Length: ' . filesize($zipname));
		readfile($zipname);

		//unlink($zipname);

		// Penser à supprimer le zip de TMP quand le dossier est détecté comme supprimé
	}

function zip2download($path){
	$zip = basename($path) . '.zip';
	$zipPath = TMP . $zip;

    if(!file_exists($zipPath)){ // Eviter de refaire le zip
    	$cmd = '7z a -r -tzip "' . $zipPath . '" "' . BASEDIR3D . $path . '" -xr\!@eaDir';
    	//$cmd = 'zip -r "' . $zipPath . '" "' . BASEDIR3D . $path . '/' . $stl_name . '"';
    	exec($cmd);
    	sleep(0.4);

    }
	downloadHeader($zipPath); // On telecharge
}

function downloadHeader($zipPath){

    $size = filesize($zipPath);

    header("Pragma: public");
    header("Cache-Control: must-revalidate, post-check=0, pre-check=0");
	header("Cache-Control: public");
	header("Content-Description: File Transfer");
    header('Content-Type: '.mime_content_type($zipPath));
    header('Content-Disposition: attachment; filename="' . basename($zipPath) . '"');
    header('Content-Transfer-Encoding: binary');
    header('Connection: Keep-Alive');
    header('Expires: 0');
    header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
    header('Content-Length: ' . $size);
    ob_end_flush();

	@readfile($zipPath);
  }


?>
