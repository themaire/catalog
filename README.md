@ 2020    Nicolas ELIE
nicolas@familleelie.fr

-- STL web catalog --

Installation guide.

!!! Thinked to be installed on a Raspberry Pi OS !!!
Otherwise you must change the models's symbolic link location in the installation script and / or adapte the install bash script yourself.

!! If you use Raspberry Pi OS Lite you will need to install git
sudo apt update && sudo apt install -y git


#1 Clone the catalog's repo : 
git clone https://github.com/themaire/catalog.git

#2
Change dir to the just cloned repo dir :
cd catalog

#3
Run the .sh script with sudo :
sudo ./install_catalog.sh

That all... Now you can add your 3d models files (forders or zip or rar files) in /home/pi/models in the thingiverse or perso folders, don't rename them.
Put your 3D models in /home/pi/models/thingiverse or /home/pi/models/perso folders. One subfolder by stl project as the exemple i left in /home/pi/models/thingiverse. You can direcly add a zip or a rar archive in these folders.

By default, a crontab script scan every 50 minutes the content of /home/pi/models and updatee the BDD content.
If you add a file in a already scanned folder, it will be added in the BDD after the scanning interval.
If you delete a folder, it will be deleted in the BDD.
