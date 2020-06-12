<?php

	// Connaitre l'id de la categorie où nous sommes
	$fieldName = "lib_id";
	$field = array($fieldName => null);
    $where = array("lib_nom" => $_SESSION['categorie']);
    $id_categorie = simpleSelect($field, "libelles", $where)['data'][0][$fieldName];
    //echo "id_categorie = $id_categorie<br>";

    // Obtenir la liste des STL de la categorie actuelle
    $field = array("stl_nom" => null, "stl_date_ajout" => null, "stl_nb_dl" => null, "stl_printed" => null, "stl_id" => null, "stl_path" => null, "stl_thumbnail" => null);
    $where = array("lib_id_categorie" => $id_categorie);
    $order = array("champ" => "stl_date_ajout", "order" => "desc");
    $stl = simpleSelect($field, 'stl', $where, null, null, null, $order)['data'];

	$strTmp = "<div class='box'>";

	$folderImg = 'img/folder_cocotte.svg';
	$missingImg = 'img/missingImg.svg';

	if(count($stl) > 0){
		foreach ($stl as $key => $value) { // Pour chaque élémeent trouvé dans l'arborescence.
			// Le chemin du dossier / archive STL
	    	$fullPath = $value["stl_path"] . "/" . $value["stl_nom"];
	    	$typeArch = fileInfo($fullPath)["ext"];

			// cellules / miniatures
			$strTmp .= '<div class="item">';
			$nom = substr($value['stl_nom'],0, 22); // Substr pour raccourcir la chaine $name.
			$image = images($value['stl_id']);
			$firstImg = $image[0]["nom"];

			if ($image == null){
				if(isset($_GET["debug"])){
					echo "pas d'image trouvée dans l'archive...";
				}
				$image = $missingImg;
			}else if(isArchive($value['stl_nom'])){
				if($value['stl_thumbnail'] == ""){
					if(count($image) > 0){
						if(isset($_GET["debug"])){
							echo "----on a des images à utiliser : " . $value['stl_thumbnail'] . " _ " .  count($image) . "--- Pour " . $value['stl_nom'] . "<br>";
						}
						//$img = getStArchName($fullPath);
						$img = imgArchName($fullPath,$firstImg);

						// $img devrait etre par exemple "tmp/img/Witcher.rar_wild-hunt-witcher-3d-model-print-file-12_980x500.png"
						if(!is_file($img)){
							// Extraction de l'image vers dossier temporaire
	        				extractFile($typeArch,$fullPath,$firstImg);
	        				$image = (is_file($img)) ? $img : $missingImg;
	        			}
	        			$binds = array("stl_thumbnail" => explode("/",$img)[2]);
						$where = array("stl_id" => $value['stl_id']);
						update("stl", $binds, $where);
					}
				}else {
					if(isset($_GET["debug"])){
						echo "---On  une thumbnail en base" . $value['stl_thumbnail'] . "--- Pour " . $value['stl_nom'] . "<br>";
					}
					$image = (is_file(TMPIMG . $value['stl_thumbnail'])) ? TMPIMG . $value['stl_thumbnail'] : $missingImg;
				}
			}else if (count($image) > 0){ // Pas une archive
				$image = (count($image) > 0) ? $image[0]['chemin'] : $missingImg;
			}

			$imageSrc = '<img class="vignette object-fit_contain" src="' . $image .'" alt=":-(">'; //Miniature à taille fixe

			$strTmp .= "<form action='' method='post' target='_self'>" .
                    		"<input id='stl' name='stl_id' value='" . $value['stl_id'] . "'type='hidden' >" .
                      		"<button type='submit' alt='stl'>" . $nom . '<br>' . $imageSrc . "</button>" .
                      	"</form>";

            // $strTmp .= "<form action='' method='post' target='_self'>" .
            //         		"<input id='dl' name='dl' value='" . $value['stl_path'] . "'type='hidden' >" .
            //           		"<button class='btn btn-primary'>Télécharger</button>" .
            //           	"</form>";

			$strTmp .= '</div>';
		}
	}else{
		echo "<h1>Rien pour l'instant dans cette categorie.</h1>";
	}	
	$strTmp .= '</div>';
	echo $strTmp;
?>