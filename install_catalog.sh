#! /bin/bash

DBPASSWD=$1

echo "Installing dependencies ..."
apt update && apt install php7.3-cgi p7zip p7zip-full -y

wget http://www.rarlab.com/rar/unrarsrc-5.9.2.tar.gz
tar zxvf unrarsrc-5.9.2.tar.gz
rm unrarsrc-5.9.2.tar.gz
cd unrar/
make -f makefile
install -v -m755 unrar /usr/bin
cd ..
rm -r unrar

echo ""
echo "Import catalog's database ..."
mysql --user=root --password=$DBPASSWD < lib3d_bdd.sql
sleep 0.3

echo ""
echo "Move project to /var/www/html/ ..."
cp -r ./catalog/ /var/www/html/
sudo chmod -R g+rwx /var/www/html/catalog/
adduser pi www-data
ln -s /var/www/html/catalog/models/ /home/pi/models
chown -R www-data:www-data /var/www/html/catalog/
chmod -R 777 /var/www/html/catalog/models/
php-cgi /var/www/html/catalog/2bdd.php

(crontab -l 2>/dev/null; echo "*/50 0,1,9-23 * * * php-cgi -f /var/www/html/catalog/2bdd.php") | crontab -
