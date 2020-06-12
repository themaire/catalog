<?php
  //session_name('Private'); 
  session_start();
  
  include("const.php");
  include("lib/fonctions/fonctions.php");
  include("lib/fonctions/func_fichiers.php");
  include("lib/fonctions/func_archives.php");

  // Opérateur Ternaire :
  // condition ? valeur si ok : valeur sinon.
  $_SESSION["titre"] = ucfirst($_POST["categorie"]) ? ucfirst($_POST["categorie"]) : "Les STLs d'Ovier";
  
  // Quand on arrive sur l'outil pour la 1ere fois ; pas de catégories choisies.
  $choixOk=false;

  if(isset($_POST["dl"])){
    if(is_dir($_POST["dl"])){
      zip2download($_POST["dl"]);
    }else if(is_file($_POST["dl"])){
      downloadHeader($_POST["dl"]);
    }
  }

  include('header.php'); // Tête de la page

  if(isset($_POST["categorie"]) || isset($_POST['stl_id']) || isset($_SESSION['stl_id'])){
    if(isset($_POST["categorie"])){
      $include = 'liste_bdd.php';
      //$include = 'liste.php';
    }else if(isset($_POST['stl_id']) || isset($_SESSION['stl_id'])){
      $include = 'fiche.php';
    }
    
    
    // Si on a changé de categorie (appuis sur bouton pour changer)
    if(isset($_POST["categorie"])){
      $_SESSION["categorie"] = $_POST["categorie"];
      $_SESSION["titre"] = ucfirst($_POST["categorie"]);
    }

    $choixOk=true;
  }else{
    echo "Welcome.";
  }

  // Ajout du navigateur de vignettes
  if ($choixOk){
    if(file_exists($include)){
      include($include);
    }
  }

  include('footer.html'); // Pied de la page
?>
