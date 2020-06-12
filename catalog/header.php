<!doctype html>
<html lang="fr" dir="ltr">
  <head>
    <meta charset="utf-8">
    <title><?php echo $titre; ?></title>

	<!-- Bootstrap CSS -->
	<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css" integrity="sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh" crossorigin="anonymous">
  <link rel="stylesheet" href="style.css">

    <!-- <script type="text/javascript" src="stl_viewer.min.js"></script> -->
    
    <!-- <script src="lib/madeleine/src/lib/stats.js"></script>
    <script src="lib/madeleine/src/lib/detector.js"></script>
    <script src="lib/madeleine/src/lib/three.min.js"></script>
    <script src="lib/madeleine/src/Madeleine.js"></script>' -->

    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
    <header class="header">
      <div class="container-fluid">
        <h1>Catalogue</h1>
        <h2>My personal STLs collection</h2>
      </div>
    </header>

    <div class="container-fluid">

      <form action="" method="post" target="_self">

      <?php
        $where = array("lib_nom_id" => 0, "lib_free" => 1);
        if($_GET['tartine'] == "speculoos"){
          $where = array("lib_nom_id" => 0);
        }

        $fieldName = "lib_nom";
        $field = array($fieldName => null);
        $join = array("libelles_noms" => "lib_id = lib_nom_nom");
        $query = simpleSelect($field, "libelles", $where);
        $data = array("data" => $query['data'], "erreur" => $query['erreur']);

        $strTmpp = "";
        foreach ($data['data'] as $value) {
          $strTmpp .= "<button type='submit' class='btn btn-default' name='categorie' value=". $value[$fieldName] . ">" . ucfirst($value[$fieldName]) . "</button>";
        }

        echo $strTmpp;
      ?>

      </form>

    </div>

    <br>
