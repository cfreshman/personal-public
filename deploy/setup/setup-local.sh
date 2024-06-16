site_setup_local() {
    echo "complete this setup: http://digitalocean.com/community/tutorials/initial-server-setup-with-ubuntu"
    read -p "press ENTER when done" ignore
    
    read -p "remote IP: " remote

    ssh $remote 'mkdir -p ~/site'
    scp ./deploy/setup/setup-remote.sh $remote:site/
    scp ./deploy/bash_profile $remote:.bash_profile
    
    echo -e "\nsshing onto remote. PLEASE RUN "sh site/setup-remote.sh"\n"
    ssh $remote
}

site_setup_local
