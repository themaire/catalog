<?php

    // STL
    $fields = array("lib_id" => null,
    				"lib_nom" => null,
    				"lib_free" => null
					);
    $where = array("lib_nom_id" => 0);
    $query = simpleSelect($fields, "libelles", $where);
    $data = array("data" => $query['data'], "erreur" => $query['erreur']);

    
    $strTmp = "<div class='container'>";
    $strTmp .= "<h1>Categories.</h1>";
    $strTmp .= "Right levels : public = 0, moderate = 1, private = 2.";
    $strTmp .= "<table class='table table-striped table-dark table-hover'>";
    $strTmp .= "<thead><tr><th>#id</th><th width=150>Name</th><th width=150>Right level</th><th>Actions</th></tr></thead>";

    $strTmp .= "<tr><td align='center'>-</td>";
    $strTmp .= "<form action='' method='post' target='_self'>";
    $strTmp .= "<td align='center'><input id='addCategories' type='text' name='lib_nom' placeholder='New name'>";
    $strTmp .= "<td align='center'><input id='assCategories' type='number' name='lib_free' placeholder='2' min='0' max='2'>";
    $strTmp .= "<td align='center'><button type='submit' class='btn btn-warning' name='newCategory'>New</button></td>";
    $strTmp .= "</form>";
    $strTmp .= "</tr>";

    if(count($data['data'])){
        foreach ($data['data'] as $value) {
            $strTmp .= "<form action='' method='post' target='_self'>";
            $strTmp .= "<tr>";
            foreach ($value as $field => $valuee){
                $strTmp .= "<td align='center'>";
                if($field == "lib_id"){
                    $id = $valuee;
                    $strTmp .= $valuee;
                }else{
                    $strTmp .= "<input type='hidden' name='lib_id' value='" . $id . "'>";

                    	if($field == "lib_free"){
                    		$type = "number";
                            $strTmp .= "<input id='updateCategories' type='" . $type . "' name='" . $field . "' value='" . $valuee . "' min='0' max='2'>";
                    	}else{
                    		$type = "text";
                            $strTmp .= "<input id='updateCategories' type='" . $type . "' name='" . $field . "' value='" . $valuee . "'>";
                            // Keep the "old" category name
                            $strTmp .= "<input type='hidden' name='name' value='" . $valuee . "'>";
                    	}
                }
                $strTmp .= "</td>";
            }
            $strTmp .= "<td align='center'>
                            <button type='submit' class='btn btn-success' name='saveCategory'>Save</button>
                            <button type='submit' class='btn btn-danger' name='deleteCategory'>Delete</button>
                        </td>";
            $strTmp .= "</tr>";
            $strTmp .= "</form>";
        }
    }
    

    $strTmp .= "</table>";
	
	$strTmp .= "</div>";

    echo $strTmp;
?>