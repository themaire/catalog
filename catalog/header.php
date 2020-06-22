<!doctype html>
<html lang="en" dir="ltr">
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
        <h1>STL catalog</h1>
        <h2>My STLs collection</h2>
      </div>
    </header>

    <div class="container-fluid">

      <form action="" method="post" target="_self">

      <?php
        

        $fieldName = "lib_nom";
        $field = array($fieldName => null);
        $join = array("libelles_noms" => "lib_id = lib_nom_nom");
        $query = simpleSelect($field, "libelles", $where);

        if(isset($_GET['tartine'])){
          if($_GET['tartine'] == "culoos"){ // Full acces
            $where = array("lib_nom_id" => 0);
            $query = simpleSelect($field, "libelles", $where); // Cool acces
          }else if($_GET['tartine'] == "speculoos"){
            $where = array("lib_nom_id" => 0);
            $or = array("lib_free" => array("1" => 0, "2" => 1));
            $query = simpleSelect($field, "libelles", $where, null, $or);
          }
          // settings button
          $settingBtn = "<td width=100px><button type='submit' class='btn btn-secondary' name='settings'>Settings</button></td>";
        }else{ // Free acces
          $where = array("lib_free" => 0);
          $query = simpleSelect($field, "libelles", $where);
        }

        $data = array("data" => $query['data'], "erreur" => $query['erreur']);

        $strTmpp = "<div class='container'>";
        $strTmpp .= "<nav class='navbar navbar-expand-lg'><table class='table table-nique-les-bordures'><tr>";
        if(count($data['data'])){
          foreach ($data['data'] as $value) {
            $strTmpp .= "<td align='center'><button type='submit' class='btn btn-primary' name='categorie' value=". $value[$fieldName] . ">" . ucfirst($value[$fieldName]) . "</button></td>";
          }
        }

        $strTmpp .= isset($settingBtn)? $settingBtn : "";
        $strTmpp .= "</tr></table></nav></div>";
      

        echo $strTmpp;
      ?>

      </form>

    </div>

    <br>