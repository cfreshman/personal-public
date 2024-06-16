site_setup_remote() {
    local SITE='freshman.dev'
    echo "setting up remote server for $SITE"
    sudo apt update

    echo "installing nginx"
    sudo apt install nginx
    sudo ufw allow 'Nginx Full'
    sudo mkdir -p /var/www/$SITE
    sudo chown -R $USER:$USER /var/www/$SITE
    sudo chmod -R 755 /var/www/$SITE
    echo "hello world" > /var/www/$SITE/index.html
    local NGINX_BLOCK="server {
    listen 80;
    listen [::]:80;

    root /var/www/$SITE;
    index index.html;

    server_name $SITE;

    location / {
        try_files $uri $uri/ =404;
    }
}"
    sudo touch /etc/nginx/sites-available/$SITE
    sudo chown -R $USER:$USER /etc/nginx/sites-available/$SITE
    echo "$NGINX_BLOCK" > /etc/nginx/sites-available/$SITE
    sudo ln -s /etc/nginx/sites-available/$SITE /etc/nginx/sites-enabled/

    echo "opening firewall"
    sudo ufw enable
    sudo ufw allow OpenSSH

    echo "installing certbot"
    sudo snap install core; sudo snap refresh core
    sudo apt remove certbot
    sudo snap install --classic certbot
    sudo ln -s /snap/bin/certbot /usr/bin/certbot

    echo
    echo "check the bare IP to check this worked"
    echo "the rest of setup is manual: pm2, correct nginx, certbot, rc.local"
    echo "resources:"
    echo "nginx: https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-22-04"
    echo "certbot: https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-22-04"
}

site_setup_remote
