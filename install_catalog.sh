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
  echo "${JAUNE}Import catalog's database ...${NORMAL}"
  mysql --user=root --password=$MYSQL_ROOT_PASSWD < lib3d_bdd.sql
  sleep 0.3
  echo "${JAUNE}Create admin user${NORMAL}"
  mysql --user=root --password=$MYSQL_ROOT_PASSWD -e "CREATE USER 'admin'@'%' IDENTIFIED BY '$MYSQL_ROOT_PASSWD';"
  mysql --user=root --password=$MYSQL_ROOT_PASSWD -e "GRANT ALL PRIVILEGES ON *.* TO 'admin'@'%' WITH GRANT OPTION;"
  mysql --user=root --password=$MYSQL_ROOT_PASSWD -e "FLUSH PRIVILEGES;"

  echo "${VERT}Step database mariadb OK${NORMAL}"
}

step_apache() {
  WEBSERVER_HOME=/var/www/html
  mkdir -p /var/www/html/log/
  echo "---------------------------------------------------------------------"
  echo "${JAUNE}Start step apache${NORMAL}"

  apt install -y apache2 apache2-utils libexpat1 ssl-cert

  cp install/apache_security /etc/apache2/conf-available/security.conf
  sed -i -e "s%WEBSERVER_HOME%${WEBSERVER_HOME}%g" /etc/apache2/conf-available/security.conf
  
  rm /etc/apache2/conf-enabled/security.conf > /dev/null 2>&1
  ln -s /etc/apache2/conf-available/security.conf /etc/apache2/conf-enabled/
  
  cp install/apache_default /etc/apache2/sites-available/000-default.conf
  sed -i -e "s%WEBSERVER_HOME%${WEBSERVER_HOME}%g" /etc/apache2/sites-available/000-default.conf
  rm /etc/apache2/sites-enabled/000-default.conf > /dev/null 2>&1
  ln -s /etc/apache2/sites-available/000-default.conf /etc/apache2/sites-enabled/
  
  rm /etc/apache2/conf-available/other-vhosts-access-log.conf > /dev/null 2>&1
  rm /etc/apache2/conf-enabled/other-vhosts-access-log.conf > /dev/null 2>&1
  
  mkdir /etc/systemd/system/apache2.service.d
  echo "[Service]" > /etc/systemd/system/apache2.service.d/privatetmp.conf
  echo "PrivateTmp=no" >> /etc/systemd/system/apache2.service.d/privatetmp.conf
  
  systemctl daemon-reload
  
  for file in $(find / -iname php.ini -type f); do
    echo "Update php file ${file}"
    sed -i 's/max_execution_time = 30/max_execution_time = 600/g' ${file} > /dev/null 2>&1
    sed -i 's/upload_max_filesize = 2M/upload_max_filesize = 1G/g' ${file} > /dev/null 2>&1
    sed -i 's/post_max_size = 8M/post_max_size = 1G/g' ${file} > /dev/null 2>&1
    sed -i 's/expose_php = On/expose_php = Off/g' ${file} > /dev/null 2>&1
    sed -i 's/;opcache.enable=0/opcache.enable=1/g' ${file} > /dev/null 2>&1
    sed -i 's/opcache.enable=0/opcache.enable=1/g' ${file} > /dev/null 2>&1
    sed -i 's/;opcache.enable_cli=0/opcache.enable_cli=1/g' ${file} > /dev/null 2>&1
    sed -i 's/opcache.enable_cli=0/opcache.enable_cli=1/g' ${file} > /dev/null 2>&1
    sed -i 's/memory_limit = 128M/memory_limit = 256M/g' ${file} > /dev/null 2>&1
  done
  
  a2dismod status
  systemctl restart apache2 > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    service apache2 restart
    if [ $? -ne 0 ]; then
      echo "${ROUGE}Ne peut redémarrer apache - Annulation${NORMAL}"
      exit 1
    fi
  fi

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
  echo "${JAUNE}Move project to /var/www/html/ ...${NORMAL}"
  cp -r ./catalog/ /var/www/html/
  sudo chmod -R g+rwx /var/www/html/catalog/
  adduser pi www-data
  ln -s /var/www/html/catalog/models/ /home/pi/models
  chown -R www-data:www-data /var/www/html/catalog/
  chmod -R 777 /var/www/html/catalog/models/
  
  echo "<?php" > "/var/www/html/catalog/database_root_password.php"
  echo "define('DBPASSWD', '$MYSQL_ROOT_PASSWD');" >> "/var/www/html/catalog/database_root_password.php"
  echo "?>" >> "/var/www/html/catalog/database_root_password.php"
  chown -R www-data:www-data /var/www/html/catalog/database_root_password.php
  
  php-cgi -f /var/www/html/catalog/2bdd.php

  echo "${VERT}Step mooving catalog OK${NORMAL}"
}

echo "Installing dependencies ..."
apt update && apt install -y p7zip p7zip-full
step_database
step_apache
step_php
if [ ! -f /usr/bin/unrar ]; then
	step_unrar
fi
step_catalog


(crontab -l 2>/dev/null; echo "*/10 0,1,9-23 * * * php-cgi -f /var/www/html/catalog/2bdd.php") | crontab -
