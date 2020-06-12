<?php


  // function PrezipFileTmp($zipFile, $fileInZip){
  //   $zip = zip_open($zipFile);
  //   if ($zip){
  //     while ($zip_entry = zip_read($zip)){
  //       echo "<p>";
  //       echo "Name: " . zip_entry_name($zip_entry) . "<br />";
     
  //       if (zip_entry_open($zip, $zip_entry))
  //         {
  //         echo "File Contents:<br/>";
  //         $contents = zip_entry_read($zip_entry);
  //         echo "$contents<br />";
  //         zip_entry_close($zip_entry);
  //         }
  //       echo "</p>";
  //     }
  //   }
  // }

  function getZipFile($zipFile, $fileInZip){
    if(is_file($zipFile)){
      $zip = zip_open($zipFile);
      if ($zip){
        while ($zip_entry = zip_read($zip)){
          if(zip_entry_name($zip_entry) == $fileInZip){
            if (zip_entry_open($zip, $zip_entry)){
              $pickedFile = zip_entry_read($zip_entry,zip_entry_filesize($zip_entry));
              break;
            }
          }
        }
      }
      zip_entry_close($zip_entry);
      return $pickedFile;
    }else{
      return false;
    }
  }

  function getRarFile($rarFile, $fileInRar, $exportFilePath){
    if(is_file($rarFile)){
      $cmd = "unrar e " . '"' . $rarFile . '" "' . $fileInRar . '" "' .  $exportFilePath . '"';
      return exec($cmd);
    }else{
      return false;
    }
  }

  function extractFile($type,$archive,$name){
    // A faire : faire en sorte pour à la fois les fichiers ordinaires et les images
    // $archive : chemin de l'archive
    // $name : nom dans l'archive

    $target = imgArchName($archive,$name);
    if($type == "zip"){
      if(!is_file($target)){ // Dans le cas où le fichier n'existe pas
        file_put_contents($target, getZipFile($archive, $name)); // Ecriture du fichier
        while(!is_file($target)){ // Attendre que le fichier soit écrit
            sleep(0.1);
            continue;
        }
      }
    }else if($type == "rar"){
      if(!is_file($target)){ // Dans le cas où le fichier n'existe pas
        if(getRarFile($archive, $name, TMPIMG)  == "All OK"){ // Ecriture du fichier
          $fileToMoove = TMPIMG . fileInfo($name)["name"];
          while(!is_file($fileToMoove)){ // Attendre que le fichier soit écrit
              sleep(0.2);
              continue;
          }
          rename($fileToMoove, $target);
        }
      }
    }
    if(isset($_GET["debug"])){
      echo "Fonction ExtractFile<br>target (fichier à écrire)= " . $target ."<br>";
      echo "fileToMoove (si zip) = " . $fileToMoove ."<br>";
      echo "type = " . $type ."<br>";
      echo "archive = " . $archive ."<br>";
      echo "name = " . $name ."<br>";
    }
  }

  function imgArchName($archive,$name){
    // retourne le nom d'une image d'un zip pour mettre dans dossier TMP.
    // exemple ; tmp/img/salut_les_copains.zip_toto.jpg

    $exlArch = explode("/", $archive); // Liste du chemin de l'archive
    $archName = $exlArch[count($exlArch) - 1]; // Juste le nom de l'archive
    $exlName = explode("/", $name); // Liste du chemin du fichier
    $fileName = $exlName[count($exlName) - 1]; // Juste le nom du fichier
    $newname = TMPIMG . $archName . '_' . $fileName;
    return $newname;
  }

  // function imgTemphName($archive,$name){
  //   // retourne le nom d'une image d'un zip pour mettre dans dossier TMP.
  //   // exemple ; tmp/img/salut_les_copains.zip_toto.jpg

  //   $exlArch = explode("/", $archive); // Liste du chemin de l'archive
  //   $archName = $exlArch[count($exlArch) - 1]; // Juste le nom de l'archive
  //   $exlName = explode("/", $name); // Liste du chemin du fichier
  //   $fileName = $exlName[count($exlName) - 1]; // Juste le nom du fichier
  //   $newname = TMPIMG . $archName . '_' . $fileName;
  //   var_dump($newname);
  //   return $newname;
  // }

  function isArchive($stl_nom){
    $ext = fileInfo($stl_nom)["ext"];
    $result = ($ext == "zip" || $ext == "rar" || $ext == "7z") ? true : false;
    return $result;
  }

  function getStArchName($fullPath){
    // Cherche la premiere image vue dans une archive puis
    // regarde si elle existe, sinon l'extrait.
    // retourne : la première image trouvée dans l'archive
    $typeArch = fileInfo($fullPath)["ext"]; 
    if($typeArch == "zip"){
      $files = openZip($fullPath);
    }else if($typeArch == "rar"){
      $files = openRar($fullPath);
    }else{
      $typeArch = "merde";
    }
    echo $typeArch . "<br>";
    foreach($files as $value){
      $typeFile = fileInfo($value['name'])["ext"];
      if($typeFile == "jpg" || $typeFile == "jpeg" || $typeFile == "png"){
        $img = imgArchName($fullPath,$value['name']);
        if(!is_file($img)){
          extractFile($typeArch,$fullPath,$value['name']);
        }
        return $img;
      }
    }
    return false;
  }

  // A faire une fonction qui supprome les STL et les images temporaires si la fonction
  // delBdd() est utilisée

?>