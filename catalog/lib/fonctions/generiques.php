<?php
	function connectDb($dbname = null){
		try{
            $retour['erreur'] = false;
			if(is_null($dbname)){
				if(dbDefault != null){
					$dbname = dbDefault;
				}else{
					throw new PDOException('Auncune base spécifiée en paramètre ou en bdd par défaut de l\'application');
				}
			}
			$user = DBUSER;
            $code = DBPASSWD;
            $host = DBHOST;

            //Connection à la base 
            $pdo_options[PDO::ATTR_ERRMODE] = PDO::ERRMODE_EXCEPTION;
            $bdd = new PDO('mysql:host='.$host.';port=' . DBPORT . ';dbname='. $dbname,$user,$code,$pdo_options);
            $retour['data'] = $bdd;
		}catch(PDOException $e){
            $retour = catchCore($e, 'connectDb');
		}
        return $retour;
	}

    function simpleSelect($arrayCmd, $table, $binds = null, $join = null, $or = null, $dbname = null, $order = null){ //construit et exécute un select à partir de deux tableaux associatifs.
                                                                    //un pour les champs à récupérer, l'autre pour construire le where et les binds
                                                                    //requête ultra basique sans jointure avec des AND en condition;
        try{
            $retour['erreur'] = false;
            if(is_array($arrayCmd)){
                $cmdSQL = 'select ';
                $cpt = 0;
                foreach($arrayCmd as $key => $value){
                    if($cpt == 0){
                        $stField = $key;
                    }
                	if(!is_null($join)){
                		$alias = substr($key, 0, 2) . '.';
                	}else{
                		$alias = '';
                	}
                    $cmdSQL .= $alias . $key . ', ';
                    $cpt++ ;
                }

                $cmdSQL = substr($cmdSQL, 0, strlen($cmdSQL)-2);
                if(!is_null($join)){
                		$aliasTable = ' '. substr($table, 0, 2) . '.';
                }else{
                	$aliasTable = '';
                }
                $cmdSQL .= ' from ' . $table . substr($aliasTable, 0, -1);
                if(!is_null($join)){
                	if(is_array($join)){
                		foreach($join as $key => $value){
                    		$cmdSQL .= ' left join ' . $key . ' ' . substr($key, 0, 2) . ' ON ' . $value;
                		}
                	}
                }
                if(!is_null($binds)){
                    if(is_array($binds)){
                        $cmdSQL .= ' where ';
                        foreach($binds as $bind => $value){
                        	if(is_int($value) || is_double($value)){
                        		$cmdSQL .= $bind . " = " . $value . " and ";
                        	}else{
                        		$cmdSQL .= $bind . " = '" . $value . "' and ";
                        	}
                        }
                        if(!is_null($or) and count($or["type"]) >= 2){
                			$cmdSQL .= "(";
                			foreach($or as $bind => $value){
      							foreach ($value as $subValue) {
      								$cmdSQL .= $bind . " = '" . $subValue . "' || ";
      							}
	                		}
	                		$cmdSQL = substr($cmdSQL, 0, strlen($cmdSQL) - 4);
	                		$cmdSQL .= ")";
                		}else{
                			$cmdSQL = substr($cmdSQL, 0, strlen($cmdSQL)-5);
                		}
                    }else{
                        throw new Exception("binds doit être un tableau associatif ou null.");
                    }
                    if($join == null){
                        // $cmdSQL .= " order by " . $stField;
                        
                    }
                    if(is_array($order)){
                        $cmdSQL .= " order by " . $order["champ"] . " " . $order["order"];
                    }
                }
                if(isset($_GET["debug"])){
                	echo $cmdSQL . "<br>";
                }
                $select = select($cmdSQL, $binds, $dbname);
                if($select['erreur'] === true){
                    throw new Exception($select['debug']);
                }else{
                    $retour['data'] = $select['data'];
                }
            }else{
                throw new Exception("arrCmd doit être un tableau associatif avec en clef le nom des champs à récupérer.");
            }
        }catch(Exception $e){
            $retour = catchCore($e, 'simpleSelect');
        }
        return $retour;
    }

	function select($cmdSQL, $binds = null, $dbname = null){
		try{
            $retour['erreur'] = false;
			$bindexec = bindexec($cmdSQL, $binds, false, $dbname);
            $i = 0;
            if($bindexec['erreur'] === true){
                $retour['erreur'] = true;
                throw new PDOException($retour['debug']."Une requête a échoué : ".$cmdSQL.'      -----   ');
            }else{
                $stmt = $bindexec['data'];
    			while($row = $stmt->fetch(PDO::FETCH_ASSOC)){
    	            $j = 0;
    	            foreach($row as $key => $value){
                        //$typecol = $stmt->getColumnMeta($j)['sqlsrv:decl_type'];
                        $typecol = $stmt->getColumnMeta($j)['native_type'];
                        //echo '<br><br> type col =' . var_dump($stmt->getColumnMeta($j));
    	                $list[$i][$key] = ($typecol == 'bit') ? formBool($value) : $value;
                        if($typecol == 'bit'){
                            $list[$i][$key] = formBool($value);
                        }elseif($typecol == 'LONG' || $typecol == 'LONGLONG' || $typecol == 'float' || $typecol == 'real'){
                            $list[$i][$key] = nbFromBdd($value);
                        }else{
                            $list[$i][$key] = $value;
                        }
    	                $j++;
    	            }
    	            $i++;
    	        }
                $retour['data'] = (empty($list)) ? null : $list;
            }
		}catch(PDOException $e){
            $retour = catchCore($e, 'select');
	    }

	    return $retour;
	}

	function insert($table, $binds, $multiFields = false, $dbname = null){ // binds est un tableau associatif avec en indice le noms des champs de la BDD
		try{                                          // retourne l'id de l'enregistrement inséré, ou false et log si problème.
            $retour['erreur'] = false;
	        $cmdSQLInsert = 'insert into '.$table.' (';
	        $cmdSQLValues = ') values (';
            foreach($binds as $key => $value){
	            $cmdSQLInsert .= $key.', ';
                if(is_string($value)){
                    $cmdSQLValues .= '"' . $value . '", ';
                }else{
                    $cmdSQLValues .= $value . ', ';
                }
	            
	        }
	        $cmdSQLInsert = substr($cmdSQLInsert, 0, strlen($cmdSQLInsert)-2);
	        $cmdSQLValues = substr($cmdSQLValues, 0, strlen($cmdSQLValues)-2).')';
	        $cmdSQL = $cmdSQLInsert.$cmdSQLValues;
            if(isset($_GET["debug"])){
                    echo $cmdSQL . "<br>";
            }
	        $exec = bindexec($cmdSQL, $binds, true, $dbname);
            if($exec['erreur'] === true){
                $retour['erreur'] = true;
                throw new PDOException("Une requête a échoué : ".$cmdSQL.'      -----   ');
            }else{
                $retour['data'] = $exec['data'];
            }

	    }catch(PDOException $e){
            $retour = catchCore($e, 'insert');
	    }
        return $retour;
    }

    function update($table, $binds, $where = null , $dbname = null){
    	try{
            $retour['erreur'] = false;
	    	$cmdSQL = 'update '.$table.' set ';
	    	foreach($binds as $key => $value){
                $cmdSQL .= $key . " = '" . $value . "', ";
                // if(is_int($value) || is_double($value)){
                //     $cmdSQL .= $key . " = " . $value . ", ";
                // }else{
                //     echo "la valeur est $value<br>";
                //     $cmdSQL .= $key . " = '" . $value . "', ";
                // }

	    	}
	    	$cmdSQL = substr($cmdSQL, 0, strlen($cmdSQL)-2). ' ';
            if($where != null){
                $cmdSQL .= " where ";
                foreach($where as $bind => $value){
                    if(is_int($value) || is_double($value)){
                        $cmdSQL .= $bind . " = " . $value . " and ";
                    }else{
                        $cmdSQL .= $bind . " = '" . $value . "' and ";
                    }
                }
                $cmdSQL = substr($cmdSQL, 0, strlen($cmdSQL)-5);
            }



            if(isset($_GET["debug"])){
                echo $cmdSQL . "<br>";
            }

	    	$exec = bindexec($cmdSQL, $binds, false, $dbname);
            if($exec['erreur'] === true){
                $retour['erreur'] = true;
                throw new PDOException("Une requête a échoué : ".$cmdSQL.'      -----   ');
            }
	    }catch(PDOException $e){
            $retour = catchCore($e, 'update');
	    }
        return $retour;
    }

    function delete($table, $where = null , $dbname = null){
    	try{
            $retour['erreur'] = false;
	    	$cmdSQL = 'delete from ' . $table . ' where ';
	    	foreach($where as $key => $value){
	    		$cmdSQL .= $key . ' = ' . $value . ' and ';
	    	}
	    	$cmdSQL = substr($cmdSQL, 0, strlen($cmdSQL) - 5);
	    	$exec = bindexec($cmdSQL, null, false, $dbname);

            if($exec['erreur'] === true){
                $retour['erreur'] = true;
                throw new PDOException("Une requête a échoué : " . $cmdSQL . '      -----   ');
            }
	    }catch(PDOException $e){
            $retour = catchCore($e, 'delete');
	    }
        return $retour;
    }

	function bindexec($cmdSQL, $binds = null, $insert = false, $dbname = null){
        // binds est un tableau associatif avec en indice le nom des :paramètre de la requête sans les :
        // si insert = false retourne le stmt exécuté, sinon l'id de la ligne insérée
		try{
            $retour['erreur'] = false;
            $bdd = connectDb($dbname);
			if($bdd['erreur'] === true){
                throw new PDOException ($bdd['debug']);
            }else{
    	        $stmt = $bdd['data']->prepare($cmdSQL);

    	        if(!is_null($binds)){
    	            foreach($binds as $id => $bind){
    	                $param = ':'.$id;
    	                if(is_numeric($bind)){
    	                    if(strpos($bind, '.') === false){
    	                        $stmt->bindValue($param, $bind, PDO::PARAM_INT);
    	                    }else{
    	                        $stmt->bindValue($param, $bind, PDO::PARAM_STR);
    	                    }
    	                }elseif(is_bool($bind)){
    	                    $stmt->bindValue($param, $bind, PDO::PARAM_BOOL);
    	                }else{
    	                    $stmt->bindValue($param, $bind, PDO::PARAM_STR);
    	                }
    	            }
    	        }

    	        $stmt->execute();

                $retour['data'] = ($insert) ? intval($bdd['data']->lastInsertId()) : $stmt;
            }
	    }catch(PDOException $e){
            $retour = catchCore($e, 'bindexec');
	    }

        return $retour;
	}

	function _log($message, $alerte = false, $log = 'log.txt', $logMail = 'logMail.txt'){
		try{
            // if(file_exists($log) && filesize('toto.txt') > 5242880){ //
            //     rename($log, $log.'_save_'.date('Y_m_d'));
            // }
	        $logFile = fopen($log, 'a');
	        fwrite($logFile, date('d/m/Y - H:i:s').'   : '.$message."\r\n");
	        fclose($logFile);
	        if($alerte){
	            $logMail = fopen($logMail, 'a');
	            fwrite($logMail, $message."<br/>");
	            fclose($logMail);
	        }
	    }catch(Exception $e){
	    	echo $e->getMessage();
	    }
    }

    function scanDoss($doss){
    	// Obtenir la liste des elements du dossier sans le . et le .. .
        $scan = array_diff(scandir($doss), array('..', '.', 'Thumbs.db', '.DS_Store', '@eaDir'));
        $llisteise = array();
        foreach($scan as $value){
            $liste[] = $value;
        }
        return $liste;
    }

    function formData($data, $remplace = null){
        if (is_numeric($data)){
            return $data;
        }else if ($data == " "){
            return "";
        }else{
            return $data == null ? $remplace : $data;
        }
    }

    function formDteForSql($dte){
        //$dte arrive au format YYYY-MM-DD
        
        // Le but ici etant de la convertir au format YYYY-DD-MM pour SQL ... 
        
        try {
            if($dte != null){
                $dte = explode(" ", $dte)[0];
                $tab = explode("-", $dte); 
                if(count($tab) == 3){
                    return $tab[0]."-".$tab[2]."-".$tab[1];
                }else{
                    $tab = explode("/", $dte); 
                    return $tab[2]."-".$tab[0]."-".$tab[1];
                }
            }else{
                return $dte;
            }
        } catch (Exception $e) {
            echo  "Erreur : " . $e->getMessage() . "impossible de convertir la date : " . $dte . "\n";
            return null;
        }
    }

    function formNumber($data, $type = 'int'){
        
        if (is_numeric($data)){
            if ($type == 'int'){
                return intval($data);
            }else if ($type == 'float'){
                return floatval($data);
            }else if($type == 'money'){
                return round(floatval($data),2);
            }
        }else{
            return NULL;
        }
    }

	function arrayToObject($array){
		try{
			$object = new stdClass();
			foreach($array as $key => $value){
				if(is_array($value)){
					$value = arrayToObject($value);
				}
				$object->$key = $value;
			}
			return $object;
		}catch(Exception $e){
			_catch($e->getMessage());
			return false;
		}
	}

    function pivot2Cols($list, $valueAsKey, $valueAsValue){
        try{
            $retour = array();
            foreach($list as $elem){
                $retour[$elem[$valueAsKey]] = $elem[$valueAsValue];
            }
            return $retour;
        }catch(Exception $e){
            _catch($e->getMessage().' Fonction pivot2Cols');
            return false;
        }
    }

    function getExt($file){
        return pathinfo($file, PATHINFO_EXTENSION);
    }

    function formBool($data){
        return $data==1?true:false;
    }

    function formValues($value){
        return (is_numeric($value)) ? $value.', ' : '\''.str_replace("'", "''", $value).'\', ';
    }

    function checkInputStr($str){ // retourne false si un caractère spécial de la liste est trouvé.
        $search = array(1 => '*', 2 => '%', 3 => '.', 4 => '\\', 5 => '[', 6 => ']', 7 => '<', 8 => '>', 9 => '&', 10 => '|', 11 => '@', 12 => '\'', 13 => '{', 14 => '}', 15 => '^', 16 => '#', 17 => '~', 18 => '°', 19 => ';', 20 => '!', 21 => '§', 22 => ',', 23 => '(', 24 => ')');

        foreach($search as $s){
            if(strpos($str, $s) !== false) return false;
        }

        return true;
    }

    function oneEmpty($binds){ //retourne true si un seul élément d'un tableau répond true à la fonction empty
        foreach($binds as $bind){
            if(empty($bind) && $bind !== false){
                return true;
            }
        }
        return false;
    }

    function postToJson($post){
        return (array) json_decode(stripslashes($post));
    }

    function getJsonList($post){
        return format(json_decode(stripslashes($post), true)); //Avec true (paramètre optionnel "assoc" de json_decode), les objets sont convertis en tableaux associatifs
    }

    function true($var){
        return ($var === "true" || $var === true) ? true : false;
    }

    function null($var){
        return ($var === null || $var === "null" || $var == 'undefined') ? true : false;
    }

    function format(&$tab){
        foreach($tab as &$elem){
            if(is_array($elem)){
                format($elem);
            }else{
                if($elem === "true") $elem = true;
                if($elem === "false") $elem = false;
                if(is_numeric($elem)){
                    if(is_integer($elem)) $elem = intval($elem);
                }
            }
        }
        return $tab;
    }

    function _catch($message){
        $retour = array('erreur' => true, 'type' => 'danger', 'msg' => 'Un problème est survenu, contactez l\'administrateur.');
        return $retour;
    }

    function catchCore($e, $nomFonction){
        _log($e->getMessage().' Fonction '.$nomFonction);
        $retour['erreur'] = true;
        $retour['debug'] = $e->getMessage().' Fonction '.$nomFonction;
        return $retour;
    }

    function nbFromBdd($nb){
        $nb = intval($nb);
        return (round($nb * 100)) / 100;
    }

    function human_filesize($bytes, $decimals = 2) {
        $sz = 'BKMGTP';
        $factor = floor((strlen($bytes) - 1) / 3);
        return sprintf("%.{$decimals}f", $bytes / pow(1024, $factor)) . @$sz[$factor];
    }

    function find_in_array($array, $target){
        // Recherche dans $array si le $target existe en clé.
        // Retourne la clé correcpondante
        foreach ($array as $key => $value) {
            if(array_search($target, $value) != false){
                $result = $key;
                break;
            }else{
                $result = false;
            }
        }
        return $result;
    }


?>
