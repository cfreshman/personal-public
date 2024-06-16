# Uh something broke
Now run the prod server like this:
```
screen -mS site
export NODE_ENV=production
source ~/.bash_profile
personal
sudo yarn db-up
sudo ts-node -P ./tsconfig.json --transpileOnly --esm --experimental-specifier-resolution=node ./server/index.ts
```
and detach with ```ctrl+a``` ```ctrl+d```

# New setup
1 new ubuntu 24 (my new ip is 142.93.12.206)
2 ubuntu setup https://www.digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu
3 nginx setup https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-22-04
4 certbot https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-22-04

# Deploy site (build locally)
with site repository on local machine at
    # ~/dev/personal

and remote aliased to
    # drop

deploy site to
    # cyrus@drop:/var/www/personal

with local command
    drops

drops() {
    # local & remote directory
    pushd ~/dev/personal
    local remote='cyrus@drop:/var/www/personal/'

    # build site locally
    yarn build

    # sync (package.json /build /server) to remote
    scp ./package.json $remote
    rsync -avze ssh build $remote --delete # contains built /public & /src
    rsync -avze ssh server $remote --delete
    rsync -avze ssh deploy $remote --delete

    # restart server
    ssh cyrus@drop 'cd /var/www/personal && yarn install && pm2 restart index'

    popd
}

# Deploy site (build remotely after git push)
cd to site, git pull, and build
    command:
pup

# Set up server
- ssh key
- nginx
- firewall
- remote:
- install node / yarn (latest node from https://nodejs.org/en/download)
mkdir node && curl https://nodejs.org/dist/v18.16.0/node-v18.16.0-linux-x64.tar.xz --output n.tar.xz && tar -xf n.tar.xz -C node --strip-components 1 && rm n.tar.xz
for bin in node npm npx; do sudo rm /bin/$bin && sudo ln -s /home/cyrus/node/bin/$bin /bin/$bin; done
npm install --global yarn
- mongo
- ts-node
  npm install -g typescript ts-node
- drops
- mkdir backups/ data/ file/

  

# Set up reverse proxy
- provision rN (instructions assume provisioned with ssh key for cyrus@mac)
- local:
- add to /etc/hosts:
<ip> <rN>
- add to ~/.ssh/config
Host <rN>
  HostName <ip>
- ssh as root
ssh root@rN
- remote:
- add sudo user & copy ssh keys
adduser cyrus && adduser cyrus sudo && cp -r .ssh /home/cyrus && chown cyrus:cyrus /home/cyrus/*
- enable firewall & open 22 (ssh) / 80 (http) / 443 (https) & exit
ufw enable && ufw allow 22 && ufw allow 80 && ufw allow 443 && exit
- local:
- copy bash aliases & re-ssh
scp deploy/bash_profile rN:/home/cyrus/.bash_profile && ssh -t rN bash -ilc "\"source .bash_profile\""
- create /var/www/personal
sudo mkdir /var/www/personal && sudo chown cyrus:cyrus /var/www/personal
- install certbot
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
snap set certbot trust-plugin-with-root=ok
sudo snap install certbot-dns-digitalocean
- install nginx & exit
sudo apt update && sudo apt install nginx && sudo nginx && sudo rm /etc/nginx/sites-enabled/*
- also chown nginx I guess, was taking too long to figure out a better way
sudo chown cyrus:cyrus /etc/nginx/**/* && exit
- deploy nginx reverse proxy server
drop-s rN && ssh -t rN bash -ilc "\"enable-server reverse-proxy\""

# /deploy changes
    drop-s  # send changes
    drop  # ssh onto host
    in  # install /deploy changes
    # if new /deploy/nginx added:
    enable-server <name>
    # restart modified server
    rs <name>

# For each new domain:
# - set DNS to server
# - add to deploy/domains (here)
# - add to deploy/nginx/personal
# - cert
# - add to server/domains.ts
# - add to src/index.ts
# - (optional) set up email forwarding



# Reverse proxy
- ubuntu 20 (WSL?) on box
- $4 digitalocean server

server {
    server_name default;
    include sites-available/F/personal-ssl;
    add_header 'Access-Control-Allow-Origin' '*';
    location / {
        proxy_pass https://<box ip>$request_uri;
        proxy_set_header Host freshman.dev;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}

# Public git repository
```
export project=<name>
git init $project
git clone --bare $project $project.git
scp -r $project.git freshman.dev:
ssh -t freshman.dev "sudo cp -rf $project.git /srv/git && cd /srv/git/$project.git && sudo git init --bare --shared && sudo chown -R git:git /srv/git"
```

# Upload git
```
export project=<name>
ssh -t freshman.dev "sudo mkdir -p /srv/git/$project.git && cd /srv/git/$project.git && sudo git init --bare && sudo touch git-daemon-export-ok && sudo chown -R git:git /srv/git"
```

# Reset git
```
export project=<name>
rm -rf .git && git init && ga && git commit -m "Initial commit" && git remote add o ssh://git@freshman.dev:22/srv/git/$project.git && 
git push --force && git remote add github git@github.com:cfreshman/$project.git && git push github --force
```