#! /bin/sh

VERT="\\033[1;32m"
NORMAL="\\033[0;39m"
ROUGE="\\033[1;31m"
ROSE="\\033[1;35m"
BLEU="\\033[1;34m"
BLANC="\\033[0;02m"
BLANCLAIR="\\033[1;08m"
JAUNE="\\033[1;33m"
CYAN="\\033[1;36m"

#DBPASSWD=$1
MYSQL_ROOT_PASSWD=$(cat /dev/urandom | tr -cd 'a-f0-9' | head -c 15)
echo "<?php" > "/var/www/html/catalog/database_root_password.php"
echo "define('DBPASSWD', '$MYSQL_ROOT_PASSWD');" >> "/var/www/html/catalog/database_root_password.php"
echo "?>" >> "/var/www/html/catalog/database_root_password.php"
chown -R www-data:www-data "/var/www/html/catalog/database_root_password.php"

step_database() {
  echo "---------------------------------------------------------------------"
  echo "${JAUNE}Start step database mariadb${NORMAL}"
  echo "mysql-server mysql-server/root_password password ${MYSQL_ROOT_PASSWD}" | debconf-set-selections
  echo "mysql-server mysql-server/root_password_again password ${MYSQL_ROOT_PASSWD}" | debconf-set-selections
  apt install -y mariadb-client mariadb-common mariadb-server
  
  mysqladmin -u root password ${MYSQL_ROOT_PASSWD}
  
  systemctl status mysql > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    service mysql status
    if [ $? -ne 0 ]; then
      systemctl start mysql > /dev/null 2>&1
      if [ $? -ne 0 ]; then
        service mysql start > /dev/null 2>&1
      fi
    fi
  fi
  systemctl status mysql > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    service mysql status
    if [ $? -ne 0 ]; then
      echo "${ROUGE}Can't launch mysql - Canceling${NORMAL}"
      exit 1
    fi
  fi
  echo "${VERT}Step database mariadb OK${NORMAL}"
}

step_apache() {
  echo "---------------------------------------------------------------------"
  echo "${JAUNE}Start step apache${NORMAL}"
  apt install -y apache2 apache2-utils libexpat1 ssl-cert
  echo "${VERT}Step apache Ok${NORMAL}"
}

step_php() {
  echo "---------------------------------------------------------------------"
  echo "${JAUNE}Start step php${NORMAL}"
  apt install -y php libapache2-mod-php php-json php-mysql
  apt install -y php-curl
  apt install -y php-gd
  apt install -y php-imap
  apt install -y php-xml
  apt install -y php-opcache
  apt install -y php-soap
  apt install -y php-xmlrpc
  apt install -y php-common
  apt install -y php-dev
  apt install -y php-zip
  apt install -y php-ssh2
  apt install -y php-mbstring
  apt install -y php-ldap
  apt install -y php-cgi
  echo "${VERT}Step php OK${NORMAL}"
}

step_unrar() {
  echo "---------------------------------------------------------------------"
  echo "${JAUNE}Start step unrar${NORMAL}"
  wget http://www.rarlab.com/rar/unrarsrc-5.9.2.tar.gz
  tar zxvf unrarsrc-5.9.2.tar.gz
  rm unrarsrc-5.9.2.tar.gz
  cd unrar/
  make -f makefile
  install -v -m755 unrar /usr/bin
  cd ..
  rm -r unrar
  echo "${VERT}Step unrar OK${NORMAL}"
}

step_catalog() {
  echo ""
  echo "${JAUNE}Move project to /var/www/html/ ...{NORMAL}"
  cp -r ./catalog/ /var/www/html/
  sudo chmod -R g+rwx /var/www/html/catalog/
  adduser pi www-data
  ln -s /var/www/html/catalog/models/ /home/pi/models
  chown -R www-data:www-data /var/www/html/catalog/
  chmod -R 777 /var/www/html/catalog/models/
  php-cgi -f /var/www/html/catalog/2bdd.php
  echo "${VERT}Step mooving catalog OK${NORMAL}"
}

echo "Installing dependencies ..."
apt update && apt install -y p7zip p7zip-full

step_database
echo ""
echo "Import catalog's database ..."
mysql --user=root --password=$MYSQL_ROOT_PASSWD < lib3d_bdd.sql
sleep 0.3

step_apache
step_php
if [ ! -f /usr/bin/unrar ]; then
	step_unrar
fi
step_catalog


(crontab -l 2>/dev/null; echo "*/50 0,1,9-23 * * * php-cgi -f /var/www/html/catalog/2bdd.php") | crontab -
