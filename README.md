### Dependencies

On your local computer and remote host
* nodejs  
* yarn  
* mongodb  

On your remote host (tested with Ubuntu 18+)
* nginx  (recommended)  
* certbot (recommended, for https)  
* pm2 (recommended)  
* screen (recommended)

### Setup

#### Local Development
Run the following in the project directory:
```
npm install
npm run dev
```

#### Production Server
* replace `~/dev/personal` with the location on your computer  
* replace `cyrus@freshman.dev` with your username & domain for remote host (or raw IP)  
* replace `/var/www/personal` with the location on your remote host  
* replace `personal` with the name for your app in PM2  
* replace `port=22` if you've set a custom SSH port on your remote  
```sh
path='~/dev/personal'
remote_at='cyrus@freshman.dev'
remote_path='/var/www/personal'
pm2_name='personal'
port=22

pushd $path
yarn build

remote_full="$remote_at:$remote_path/"
scp -P $port *.* $remote_full
rsync -avz --rsh="ssh -p$port" build $remote_full --delete
rsync -avz --rsh="ssh -p$port" server $remote_full --delete
rsync -avz --rsh="ssh -p$port" deploy $remote_full --delete
ssh $remote 'cd $remote_path && yarn install'
ssh $remote "echo 'source $remote_path/deploy/bash_profile' >> ~/.bash_profile && source ~/.bash_profile && in2"
ssh $remote "screen -S test -dm bash -c 'mongod --dbpath=$remote_path/data'"
ssh $remote "pm2 start $remote_path/server/index.ts --name $pm2_name"
ssh $remote "nginx"
popd
```
You'll want to make sure the firewall allows traffic to the server:
https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-20-04#step-3-allowing-https-through-the-firewall

### Deploy

(replace same items as above) 
```sh
path='~/dev/personal'
remote_at='cyrus@freshman.dev'
remote_path='/var/www/personal'
pm2_name='personal'
port=22

pushd $path
yarn build

remote_full="$remote_at:$remote_path/"
scp -P $port *.* $remote_full
rsync -avz --rsh="ssh -p$port" build $remote_full --delete
rsync -avz --rsh="ssh -p$port" server $remote_full --delete
rsync -avz --rsh="ssh -p$port" deploy $remote_full --delete
ssh $remote 'cd $remote_path && yarn install && pm2 reload $pm2_name'
ssh $remote "cd $remote_path && source ~/.bash_profile && in2"
popd
```

### Pico-specific setup
Install git submodules in order to build Raspberry Pi Pico apps
```
cd server/routes/pico-repo/pico-sdk
git pull
git submodule update --init

cd ../pico-examples
mkdir build && cd build
cmake -DPICO_BOARD=pico_w ..
```
