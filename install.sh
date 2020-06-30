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

webdir="/var/www/html/"

# Define database password
if [ -f /var/www/html/index.php ] && [ $(cat /var/www/html/index.php &> /dev/null | head -n 3 | grep "Jeedom" | wc -l) -eq 1 ]; then
    if [ $? -ne 0 ] ; then
        jeedom=1
        echo "Jeedom detected."
    fi
else
    jeedom=0
fi

if [ "$jeedom" -eq 1 ]; then
# If Jeedom home automation is installed
    if [ ! -f "/var/www/html/catalog/database_root_password.php" ]; then
    # If need to know the db password
        if [ "$MYSQL_ROOT_PASSWD" != "" ]; then
        # Password typing by user
            # Ask user
            echo "Type the MYSQL's root password please..."
            read MYSQL_ROOT_PASSWD
            testDatabase $MYSQL_ROOT_PASSWD
        else
            echo "No password given."
            exit 1
        fi
    else
        password=$(cat "/var/www/html/catalog/database_root_password.php" | grep "define" | cut -d "'" -f 4)
        testDatabase $password
    fi
else
    if [ ! -f "/var/www/html/catalog/database_root_password.php" ]; then
    # If need to create the db passwor
        MYSQL_ROOT_PASSWD=$(cat /dev/urandom | tr -cd 'a-f0-9' | head -c 15)
    fi
fi


testDatabase() {
    mysql --user=root --password=$1 -e "select 1;" &> /dev/null
    if [ $? -ne 0 ]; then
        echo "Can't connect to the database. $1 root's password is wrong."
        exit 1
    else
        echo "Database is OK"
    fi
}

step_database() {
  echo "---------------------------------------------------------------------"
  echo "${JAUNE}Start step install database mariadb${NORMAL}"
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
  import_database
  echo "${VERT}Step install database mariadb OK${NORMAL}"
}

import_database() {
  echo "${JAUNE}Import catalog's database ...${NORMAL}"
  mysql --user=root --password=$MYSQL_ROOT_PASSWD < lib3d_bdd.sql
  sleep 0.3
  echo "${JAUNE}Create admin user${NORMAL}"
  mysql --user=root --password=$MYSQL_ROOT_PASSWD -e "CREATE USER 'admin'@'%' IDENTIFIED BY '$MYSQL_ROOT_PASSWD';"
  mysql --user=root --password=$MYSQL_ROOT_PASSWD -e "GRANT ALL PRIVILEGES ON *.* TO 'admin'@'%' WITH GRANT OPTION;"
  mysql --user=root --password=$MYSQL_ROOT_PASSWD -e "FLUSH PRIVILEGES;"

  echo "${VERT}Step database imported OK${NORMAL}"
}

step_apache() {
  WEBSERVER_HOME=/var/www/html
  mkdir -p /var/www/html/log/
  echo "---------------------------------------------------------------------"
  echo "${JAUNE}Start step apache${NORMAL}"

  apt install -y apache2 apache2-utils libexpat1 ssl-cert

  cp files_install/apache_security /etc/apache2/conf-available/security.conf
  sed -i -e "s%WEBSERVER_HOME%${WEBSERVER_HOME}%g" /etc/apache2/conf-available/security.conf
  
  rm /etc/apache2/conf-enabled/security.conf > /dev/null 2>&1
  ln -s /etc/apache2/conf-available/security.conf /etc/apache2/conf-enabled/
  
  cp files_install/apache_default /etc/apache2/sites-available/000-default.conf
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
  # Used for upgrade the project too.
  echo "${JAUNE}Move project to /var/www/html/ ...${NORMAL}"
  cp -r ./catalog/ "$webdir"
  sudo chmod -R g+rwx "$webdir""catalog/"
  chown -R www-data:www-data "$webdir""catalog/"
  chmod -R 775 "$webdir""catalog/models/"

  echo "${VERT}Step mooving catalog OK${NORMAL}"
}

create_dbPassw_file() {
  echo "<?php" > "/var/www/html/catalog/database_root_password.php"
  echo "define('DBPASSWD', '$MYSQL_ROOT_PASSWD');" >> "/var/www/html/catalog/database_root_password.php"
  echo "?>" >> "/var/www/html/catalog/database_root_password.php"
  chown -R www-data:www-data "/var/www/html/""catalog/database_root_password.php"
}

step_install_catalog() {
  # Used at the first install only.
  echo "${JAUNE}Install the project${NORMAL}"
  apt install -y php-cgi # For running php scripts command line
  adduser pi www-data
  ln -s "$webdir""catalog/models/" "/home/pi/models"

  step_catalog
  
  create_dbPassw_file
  
  php-cgi -f "/var/www/html/""catalog/2bdd.php"
  (crontab -l 2>/dev/null; echo "*/10 0,1,9-23 * * * php-cgi -f /var/www/html/catalog/2bdd.php") | crontab -

  echo "${VERT}Install catalog OK${NORMAL}"
}

# Beguin

if [ ! -d "/var/www/html/catalog/" ]; then
# Install from ZERO

    echo "Installing dependencies ..."
    apt update

    if [ ! -f "/usr/bin/7z" ]; then
        apt install -y p7zip p7zip-full
    fi

    if [ ! -f "/usr/bin/unrar" ]; then
        step_unrar
    fi

    if [ "$jeedom" -eq 1 ]; then
    # Jeedom home automation is already installed

        import_database
        step_install_catalog

    else
    # Not Jeedom found
        step_database

        systemctl status apache2.service
        if [ $? -eq 1 ]; then
          step_apache
        fi

        if [ ! -f "/usr/bin/php-cgi" ]; then
          step_php
        fi

        step_install_catalog

    fi

else
# Update the project
          step_catalog
      echo "${VERT}Update catalog OK${NORMAL}"
fi
exit 0
