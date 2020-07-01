<?php

    // Icones
    $hauteurIcon = 40;
    $iconPdf = "https://img.icons8.com/wired/64/000000/pdf.png";
    $srcIconPdf = "<img src=" . $iconPdf . " height=". $hauteurIcon . "/>";

    $iconStl = "https://img.icons8.com/wired/64/000000/3d-printer.png";
    $srcIconStl = "<img src=" . $iconStl . " height=". $hauteurIcon . "/>";

    $iconPicture = "https://img.icons8.com/wired/64/000000/picture.png";
    $srcIconPicture = "<img src=" . $iconPicture . " height=". $hauteurIcon . "/>";

    // Requettes base de données
    if(isset($_POST["stl_id"])){
        $stl_id = $_POST["stl_id"];
        $_SESSION['stl_id'] = $_POST["stl_id"];
    }else{
        $stl_id = $_SESSION['stl_id'];
    }
	//$stl_id = 49;

    // STL
    $field = array(	"stl_id" => null,
                    "stl_nom" => null,
    				"stl_date_ajout" => null,
    				"lib_nom" => null,
    				"stl_path" => null,
    				"stl_nb_dl" => null,
    				"stl_printed" => null,
    				"stl_observations" => null
					);
    $join = array("libelles" => "st.lib_id_categorie = li.lib_id");
    $where = array("stl_id" => $stl_id);
    $stl = simpleSelect($field, 'stl', $where, $join)["data"][0];
    $stl['stl_printed'] = ($stl["stl_printed"] == null) ? $stl['stl_printed'] = 'No' : $stl['stl_printed'] = 'Yes';
    $fullPath = $stl["stl_path"] . "/" . $stl["stl_nom"];
    $typeStl = fileInfo($fullPath)['ext'];

    // FILES
    $field = array(	"nom" => null,
    				"type" => null,
    				"id_categorie" => null,
    				"chemin" => null,
    				"stl_id" => null,
    				"taille" => null
					);
    $where = array("stl_id" => $stl_id);
    $order = array("champ" => "taille", "order" => "desc");
    $files = simpleSelect($field, 'fichiers_stl', $where, null, null, null, $order);

    if(count($files["data"]) > 0){
        $ext_stl_nom = fileInfo($fullPath)['ext'];
        $archive = ($ext_stl_nom == "") ? false : true;

        foreach ($files["data"] as $key => $value) {
            switch ($value['type']) {
                case "stl":
                    $fichiers["pj"][] = array("nom" => $value['nom'], "chemin" => $value["chemin"], "type" => $value["type"], "taille"  => $value["taille"]);
                    break;
                case "obj":
                    $fichiers["pj"][] = array("nom" => $value['nom'], "chemin" => $value["chemin"], "type" => $value["type"], "taille"  => $value["taille"]);
                    break;
                case "pdf":
                    $fichiers["pj"][] = array("nom" => $value['nom'], "chemin" => $value["chemin"], "type" => $value["type"], "taille"  => $value["taille"]);
                    break;
                case "jpg":
                    $fichiers["img"][] = array("nom" => $value['nom'], "chemin" => $value["chemin"], "type" => $value["type"]);
                    break;
                case "jpeg":
                    $fichiers["img"][] = array("nom" => $value['nom'], "chemin" => $value["chemin"], "type" => $value["type"]);
                    break;
                case "png":
                    $fichiers["img"][] = array("nom" => $value['nom'], "chemin" => $value["chemin"], "type" => $value["type"]);
                    break;
                default:
                    $fichiers["pj"][] = array("nom" => $value['nom'], "chemin" => $value["chemin"], "type" => $value["type"], "taille"  => $value["taille"]);
            }
        }

        if(count($fichiers['img']) > 0){
            foreach($fichiers['img'] as $value){
                if($typeStl != "" or $typeStl != null or $typeStl != 'rar'){
                    // echo "$typeStl,$fullPath," . $value['nom'] . "<br><br>";
                    extractFile($typeStl,$fullPath,$value['nom']);
                }
            }
        }
        // exit();
    }

// ===========--------

    // var_dump($_POST);

    $strTmp .= "<h1>" . $stl['stl_nom'] . "</h1>";

    if(isset($_GET)){
	$get="";
        foreach ($_GET as $key => $value){
    		$get .=  $key . "=" . $value . "<br>";
	}
    }

    $strTmp .= "<div class='container-sm'><table align='center' class='table table-nique-les-bordures'>";
    $strTmp .= "<tr>
			<thead>
			<th>#</th>
                	<th id='stl'>Added</th>
                	<th>Downloaded</th>
                	<th>Printed</th>
                	<th>Notes</th>
                </thead>
                </tr>";

    // Domain name
    $cmdSQL = "select lib_nom from libelles left join libelles_noms li on libelles.lib_nom_id = li.lib_nom_id where lib_nom_nom = 'domain';";
    $domain = select($cmdSQL)["data"][0]['lib_nom'];
  
    $strTmp .= "<tr>
    			<tbody>
			<td align='center'><a href='" . $domain . "/catalog/?stl_id=" . $stl['stl_id'] . "'>" . $stl['stl_id'] . "</a></td>
	                <td>" . $stl['stl_date_ajout'] . "</td>
	                <td>" . $stl['stl_nb_dl'] . "</td>
	                <td>" . $stl['stl_printed'] . "</td>
	                <td>" . $stl['stl_observations'] . "</td>
	            </tbody>
	            </tr>";
    $strTmp .= "</table>";

    $strTmp .= "<form action='' method='post' target='_self'>" .
                "<input id='dl' name='stl_id' value='" . $stl['stl_id'] ."' type='hidden' >" .
                "<input id='dl' name='stl_nb_dl' value='" . $stl['stl_nb_dl'] ."' type='hidden' >" .
                "<input id='dl' name='dl' value='" . $stl['stl_path'] . "/" . $stl['stl_nom'] ."' type='hidden' >" .
                "<button class='btn btn-primary'>Download</button>" .
                "</form></div><br>";
    
    $strTmp .= '<div id="listContent">';
    $strTmp .= '<div class="child_stlContent">';
    // Tableau des pièces jointes
    if(!empty($fichiers["pj"])){
        $strTmp .= "<table class='table table-dark table-striped table-hover'>";
        $strTmp .= "<tr>
      			<thead>
                        <th>#</th>
                        <th id='fichiers'>Name</th>
                        <th>Type</th>
                        <th>Size</th>
                    </thead>
                    </tr>";

        $cpt = 0;
        foreach ($fichiers["pj"] as $key => $value) {
            if($value["nom"] == "README.txt" || $value["nom"] == "LICENSE.txt" || $value["nom"] == "attribution_card.html"){
                continue;
            }

            // Préparation du bouton du formulaire
            $buttonStl =    "<input id='stl' name='type_archive' value='" . $ext_stl_nom . "'type='hidden' >" . 
                            "<input id='stl' name='stl_id' value='" . $stl_id . "'type='hidden' >" . 
                            "<input id='stl' name='chemin' value='" . $value['chemin'] . "'type='hidden' >" . 
                            "<input id='stl' name='fi_nom' value='" . $value['nom'] . "'type='hidden' >" . 
                            "<button type='submit' alt='stl'>" . $srcIconStl . "</button>";
            if($value['taille'] > 1000){
                $size = human_filesize($value['taille']);
            }else{
                $size = $value['taille'];
            }

            $cpt++ ;
            switch ($value['type']) {
                case "stl":
                    if(!$archive || LOADARCHIVE){ // Si PAS archive ou on lit les archives
                        $icon = "<form action='' method='post' target='_self'>" .
                                    $buttonStl .
                                "</form>";
                    }else{
                        $icon = "Bientôt...";
                    }
                    break;
                case "obj":
                    if(!$archive || LOADARCHIVE){ // Si PAS archive ou on lit les archives
                        $icon = "<form action='' method='post' target='_self'>" .
                                    $buttonStl .
                                "</form>";
                    }else{
                        $icon = "Bientôt...";
                    }
                    break;
                case "pdf":
                    $icon = $srcIconPdf;
                    break;
                case "jpg":
                    $icon = $srcIconPicture;
                    break;
                case "jpeg":
                    $icon = $srcIconPicture;
                    break;
                case "png":
                    $icon = $srcIconPicture;
                    break;
                default:
                    $icon = $value['type'];
            }

            $strTmp .= "<tr>
            			<tbody>
                            <td>" . $cpt . "</td>
                            <td id='nomFichier'>" . $value['nom'] . "</td>                            
                            <td>" . $icon . "</td>
                            <td>" . $size . "</td>
                        </tbody>
                        </tr>";
        }

        $strTmp .= "</table><br>";
    }else{
        /*$strTmp .= "</table>";*/
        $strTmp .= "<h1 align='center'>Can't find attached files.</h1>";
    }
    $strTmp .= '</div>';

    // Visualiseur 3D de STLs
    if(isset($_POST['fi_nom'])){

        if($_POST['type_archive'] == "zip"){
            $archive_path = $stl['stl_path'] . '/' . $stl['stl_nom'];
            $stlFile = TMP . lastElem($_POST['fi_nom']);

            if(!is_file($stlFile)){ // Dans le cas où le fichier n'existe pas
                file_put_contents($stlFile, getZipFile($archive_path, $_POST['fi_nom'])); // Ecriture du fichier
                while(!is_file($stlFile)){ // Attendre que le fichier soit écrit
                    sleep(0.1);
                    continue;
                }
            }
        }else if($_POST['type_archive'] == "rar"){
            $archive_path = $stl['stl_path'] . '/' . $stl['stl_nom'];
            $stlFile = TMP . lastElem($_POST['fi_nom']);

            if(!is_file($stlFile)){ // Dans le cas où le fichier n'existe pas
                if(getRarFile($archive_path, $_POST['fi_nom'], TMP)  == "All OK"){ // Ecriture du fichier
                    while(!is_file($stlFile)){ // Attendre que le fichier soit écrit
                        sleep(0.2);
                        continue;
                    }
                }else{
                    $stlFile = "lib/sadfacebox.stl";
                }
            }
        }else if($_POST['type_archive'] == ""){
            if(is_file($_POST['chemin'])){
                $stlFile = $_POST['chemin'];
            }else{
                    $stlFile = "lib/sadfacebox.stl";
            }
        }

        $strTmp .= '<script src="https://cdn.babylonjs.com/viewer/babylon.viewer.js"></script>';
        $strTmp .= '<div class="child_viewer">';

        if(isset($_GET['test'])){
            $strTmp .= ' <babylon scene.debug="true" camera.behaviors.auto-rotate="0 model.url="' . $stlFile . '" configuration="viewerConfig.json" ></babylon>';
        }else{
            $strTmp .= '<babylon extends="default" model="' . $stlFile . '"></babylon>';
        }
        $strTmp .= '</div>';
    }
    $strTmp .= '</div><br>';

    // 
    // ReadMe si categorie Thingiverse
    
    if($_SESSION["categorie"] == "thingiverse"){
        $keyReadme = find_in_array($fichiers["pj"], "README.txt");
        $strTmp .= "<p align='center'>" . parseFile($fichiers["pj"][$keyReadme]['chemin']) . "</p><br>";
    }


    // Images
    if(!empty($fichiers["img"])){
        $strTmp .= "<table align='center'>";
        foreach ($fichiers["img"] as $value) {
            if($typeStl == "zip" || $typeStl == "rar" || $typeStl == "7z"){
                $imgPath = imgArchName($fullPath,$value['nom']);
            }else{
                $imgPath = $value['chemin'];
            }
            $strTmp .= "<tr>
                            <td>
                                <img src='" . $imgPath . "' alt='" . $value['nom'] . "'/>
                            </td>
                        </tr>";
        }
        $strTmp .= "</table>";
    }else{
        $strTmp .= "<h1 align='center'>There are no images attached.</h1>";
    }
    $strTmp .= "<br>";


    echo $strTmp;

	//echo showlist($stl, "stl");
	//echo showlist($fichier, "fichier");

?>
