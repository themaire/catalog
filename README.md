@ 2020    Nicolas ELIE
nicolas@familleelie.fr

-- STL web catalog --

Installation guide.

!!! Thinked to be installed on a Raspberry Pi OS !!!
Otherwise you must change the models's symbolic link location in the installation script.

#1
Requirements = php>5, webserver (apache2, ngnix), mariadb.

( !!!
It is more comfortable to install all the requirements at once by installing the Jeedom home automation system installation script:

wget -O- https://raw.githubusercontent.com/jeedom/core/master/install/install.sh | sudo bash

Be carefull to store the BDD roots passord at the end of the end of the output!!

 !!! )

#2
Make sure you have the mariadb root password. You find it at the end of the Jeedom installation output.

#3
Change dir to the ust cloned repo's dir ( cd catalog )
and
Edit ./catalog/const.php and type your bdd password.

#4
Run the .sh script with sudo and add your bdd root's password like this for exemple :
sudo ./install_catalog.sh 58b145615cb786

That all... Now you can add your 3d models files (forders or zip or rar files) in /home/pi/models in the thingiverse or perso folders, don't rename them.

By default, a crontab script scan every 5 minutes the content of /home/pi/models and updatee the BDD content.
If you add a file in a already scanned folder, it will be added in the BDD.
If you delete a folder, it will be deleted in the BDD.
