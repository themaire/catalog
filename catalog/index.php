<?php
  //session_name('Private'); 
  session_start();
  
  include("const.php");
  include("lib/fonctions/fonctions.php");
  include("lib/fonctions/func_fichiers.php");
  include("lib/fonctions/func_archives.php");

  // const BASEDIR3D = "/volume1/3d/";

//   var_dump($_POST);

  // Opérateur Ternaire :
  // condition ? valeur si ok : valeur sinon.
  $_SESSION["titre"] = ucfirst($_POST["categorie"]) ? ucfirst($_POST["categorie"]) : "Les STLs d'Ovier";
  
  // Quand on arrive sur l'outil pour la 1ere fois ; pas de catégories choisies.
  $choixOk=false;

  if(isset($_POST["dl"])){
    // Increment downloaded counter
    $nbDl = intval($_POST['stl_nb_dl']) + 1;
    $fields = array( "stl_nb_dl" => $nbDl);
    $where = array("stl_id" => $_POST['stl_id']);
    update('stl', $fields, $where);

    if(is_dir($_POST["dl"])){
      zip2download($_POST["dl"]);
    }else if(is_file($_POST["dl"])){
      downloadHeader($_POST["dl"]);
    }
  }

  // Actions
  if(isset($_POST)){
    if(isset($_POST['saveCategory'])){
        $fields = array( "lib_nom" => trim(strtolower($_POST['lib_nom'])),
                        "lib_free" => $_POST['lib_free']);
        $where = array("lib_id" => $_POST['lib_id']);
        update('libelles', $fields, $where);
        // $_POST['name'] is the old name for updatin
        rename("models/" . $_POST['name'] ,"models/" . trim(strtolower($_POST['lib_nom'])));
    }else if(isset($_POST['newCategory'])){
        $fields = array( "lib_nom" => trim(strtolower($_POST['lib_nom'])),
                        "lib_free" => $_POST['lib_free'],
                        "lib_nom_id" => 0
                        );
        insert('libelles', $fields);
        $old = umask(0);
        mkdir("models/" . trim(strtolower($_POST['lib_nom'])), 0775, true);
        umask($old);
    }else if(isset($_POST['deleteCategory'])){
        $field = array( "lib_id" => $_POST['lib_id']);
        delete('libelles', $field);
        rmdir("models/" . $_POST['name']);
    }
  }

  // Web page construction
  include('header.php'); // Tête de la page

  if(isset($_POST['saveCategory']) || isset($_POST['newCategory']) || isset($_POST['deleteCategory'])){
      $include = 'settings.php';
      include($include);
  }else if(isset($_POST["categorie"]) || isset($_POST['stl_id']) || isset($_SESSION['stl_id']) || isset($_POST['settings']) || isset($_POST['settings'])){
    if(isset($_POST['settings'])){
      $include = 'settings.php';
    }else if(isset($_POST["categorie"])){
      $_SESSION["categorie"] = $_POST["categorie"];
      $_SESSION["titre"] = ucfirst($_POST["categorie"]);
      $include = 'liste_bdd.php';
    }else if(isset($_POST['stl_id']) || isset($_SESSION['stl_id'])){
      $include = 'fiche.php';
    }
    $choixOk=true;
  }else{
    echo "Welcome to the catalog project.";
  } 

  // Ajout du navigateur de vignettes
  if($choixOk){
    if(file_exists($include)){
      include($include);
    }
  }

  include('footer.html'); // Pied de la page
?>