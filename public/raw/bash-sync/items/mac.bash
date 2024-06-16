export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin"
# export PATH="/Users/cyrus/anaconda/bin:$PATH" # added by Anaconda3 4.4.0 installer
export PATH=$PATH:/Library/Frameworks/Python.framework/Versions/3.11/bin # python
export NODE_ENV='development' # Node
export PATH="$PATH:/Users/cyrus/mongodb/bin" # MongoDB
export PATH="$PATH:$HOME/espressif/xtensa-lx106-elf/bin" # esp8266 for micropython

# go
export GOPATH=$HOME/Desktop/Coding/go
export GOBIN=$GOPATH/bin
export PATH=$PATH:$GOBIN

# sublime
export PATH="/Applications/Sublime Text.app/Contents/SharedSupport/bin:$PATH"

# alias rshell='/Users/cyrus/dev/pi/pico/rshell/r.py'


source ~/.bash_sync/common.bash
init-profile $GREEN "
    f - open dir in Finder
    trash <path> - move file to Trash
    ql <path> - open file in Quicklook
    wallpaper <path> - set wallpaper
    "
alias config-mac='edit ~/.bash_sync/mac.bash'

cert() {
    local cert_list=""
    while read domain; do
        if ! [ -z "$domain" ]; then
            cert_list+="-d $domain -d *.$domain ";
        fi
    done < /var/www/personal/deploy/domains

    echo "sudo certbot --nginx $cert_list"
}
alias mem="du -h -d 1"


alias p1='ssh pi@p1'
alias p2='ssh pi@p2'
alias z1='ssh pi@z1'
alias z2='ssh pi@z2'
alias z3='ssh pi@z3'
pisend() {
    if [ $# -eq 3 ]; then
        scp $2 pi@$1:$3
    elif [ $# -eq 2 ]; then
        scp $1 pi@p1:$2
    else
        echo "expected [pi] src dst"
    fi
}
pigrab() {
    if [ $# -eq 3 ]; then
        scp pi@$1:$2 $3
    elif [ $# -eq 2 ]; then
        scp pi@p1:$1 $2
    elif [ $# -eq 1 ]; then
        scp pi@p1:$1 .
    else
        echo "unexpected args"
    fi
}
piworks() {
    local host
    if [ $# -eq 1 ]; then
        host=$1
    elif [ $# -eq 0 ]; then
        host=p2 # default to latest Pi4
    else
        echo "expected piworks [zN]"
        return 1
    fi
    echo "sync pi workspace $host"

    local folder="${host/.local/}"
    if (off $host &>/dev/null); then
        echo "try .local"
        host="$host.local"
    fi

    if (on $host &>/dev/null); then
        hostworks ~/pi/sync/$folder "pi@${host/pi@/}" ~/pi/sync/common
    fi
}
export -f piworks
alias wsa='par "piworks p1" "piworks z1" "piworks z2" "piworks z3"'
alias ws=piworks
alias piclean='rsync -avze ssh ~/pi/sync/pi/work pi@p1: --delete'
# alias outgrab='rsync -avze ssh pi@pi:output ~/pi'
outs() {
    local host
    if [ $# -eq 1 ]; then
        host=$1
    elif [ $# -eq 0 ]; then
        host=p1
    else
        echo "unexpected args"
        exit 1
    fi

    # if on $host; then
        rsync -avze ssh pi@$host:out ~/pi/sync/$host
    # fi
}

send() { scp $2 $1:$3; }
box() {
    if [ $# -eq 0 ]; then
        ssh -p4444 cyrus@box.f3n.co;
    elif [ $# -eq 1 ]; then
        hostcmd "-p4444 cyrus@box.f3n.co" "\"$@\""
    else
        echo "wrap command in quotes"
    fi
}
boxl() {
    if [ $# -eq 0 ]; then
        ssh -p4444 cyrus@boxl;
    elif [ $# -eq 1 ]; then
        hostcmd "-p4444 cyrus@boxl" "\"$@\""
    else
        echo "wrap command in quotes"
    fi
}
drop() {
    if [ $# -eq 0 ]; then
        ssh cyrus@freshman.dev;
    elif [ $# -gt 0 ]; then
        hostcmd cyrus@freshman.dev "\"$@\""
    else
        echo "wrap command in quotes"
    fi
}
drop() {
    if [ $# -eq 0 ]; then
        ssh cyrus@freshman.dev;
    elif [ $# -gt 0 ]; then
        hostcmd cyrus@freshman.dev "\"$@\""
    else
        echo "wrap command in quotes"
    fi
}
drops() {
    echo $(curL https://f3n.co/api/online)

    # local & remote directory
    pushd ~/dev/personal
    local remote='cyrus@freshman.dev'
    local build=0
    if [ $# -ge 1 ]; then
        remote=$1
    fi
    local path="$remote:/var/www/personal/"
    echo $path

    local port=22
    if [ $# -ge 2 ]; then
        port=$2
    fi

    # build site locally
    if [ $# -lt 3 ]; then
        yarn build
    fi

    # sync (package.json /build /server /deploy) to remote
    scp -P $port ./package.json $path
    rsync -avz --rsh="ssh -p$port" build $path --delete # contains built /public & /src
    rsync -avz --rsh="ssh -p$port" server $path --delete
    rsync -avz --rsh="ssh -p$port" deploy $path --delete

    # restart server
    ssh $remote 'cd /var/www/personal && yarn install && pm2 reload personal'

    popd
}
drop-s() { 
    # local & remote directory
    pushd ~/dev/personal
    local remote='cyrus@freshman.dev'
    if [ $# -ge 1 ]; then
        remote=$1
    fi
    local path="$remote:/var/www/personal/"
    local port=22
    if [ $# -ge 2 ]; then
        port=$2
    fi
    echo $path $port

    # scp -P $port *.* $path;
    # rsync -avz --rsh="ssh -p$port" build $path --delete # contains built /public & /src
    # rsync -avz --rsh="ssh -p$port" server $path --delete
    rsync -avz --rsh="ssh -p$port" deploy $path --delete

    # restart nginx servers
    hostcmd $remote "in1"

    popd
}
alias d=drops
alias s=drop-s
alias g=git
alias v='yarn dev'

dropd() {
    # local & remote directory
    pushd ~/dev/personal
    local remote='cyrus@freshman.dev:/var/www/personal/'

    # sync (package.json /build /server /deploy) to remote
    scp ./package.json $remote
    rsync -avze ssh build $remote --delete # contains built /public & /src
    rsync -avze ssh server $remote --delete
    rsync -avze ssh deploy $remote --delete

    popd
}

paths() {
    # local & remote directory
    pushd ~/dev/pathwiki
    local remote='cyrus@freshman.dev:/var/www/pathwiki/'

    # build site locally
    yarn build

    # sync (package.json /build /server /deploy) to remote
    scp ./package.json $remote
    rsync -avze ssh build $remote --delete # contains built /public & /src
    rsync -avze ssh server $remote --delete
    rsync -avze ssh deploy $remote --delete

    # restart server
    ssh cyrus@freshman.dev 'cd /var/www/pathwiki && yarn install && pm2 restart pathwiki'

    popd
}
path-s() { 
    pushd ~/dev/pathwiki;
    local remote='cyrus@freshman.dev:/var/www/pathwiki/';
    scp ./package.json $remote;
    rsync -avze ssh build $remote --delete;
    rsync -avze ssh server $remote --delete;
    rsync -avze ssh deploy $remote --delete;
    popd
}

papers() {
    # local & remote directory
    pushd ~/dev/paperchat
    local remote='cyrus@freshman.dev:/var/www/paperchat/'

    # build site locally
    yarn build

    # sync (package.json /build /server /deploy) to remote
    scp ./package.json $remote
    rsync -avze ssh build $remote --delete # contains built /public & /src
    rsync -avze ssh server $remote --delete
    rsync -avze ssh deploy $remote --delete

    # restart server
    ssh cyrus@freshman.dev 'cd /var/www/paperchat && yarn install && pm2 restart paperchat'

    popd
}

boxs() {
    if [ $# -eq 2 ]; then
        rsync -avze 'ssh -p2048' $2 $1:
        echo ""
        fswatch $2 | (
            while read; do
                rsync -avze 'ssh -p2048' $2 $1:
            done
            echo "")
    else
        echo "expected boxs <host> <folder>"
    fi
}
boxws() {
    local host
    if [ $# -eq 1 ]; then
        host=$1
    elif [ $# -eq 0 ]; then
        host=cyrus
    else
        echo "expected boxws [i]"
    fi
    
    boxs $host ~/box/work
}


tildes() {
    pushd ~/dev/tilde
    local remote='tilde:~/'
    for d in */ .[^.]*/ ; do
        echo "$d"
        d=${d%?}
        rsync -avze ssh $d $remote
    done
    rsync -avze ssh public_html $remote
    popd

    # local local=~/dev/tilde/public_html
    # rsync -avze ssh $local tilde:~/
    # echo ""
    # fswatch $local | (
    #     while read; do
    #         rsync -avze ssh $local tilde:~/
    #     done
    #     echo "")
}


log() {
    git add -A
    git commit -m "`date`"
}

alias sublime='subl'
alias edit='sublime -n'

alias f='open -a Finder ./'                 # f:            Opens current directory in MacOS Finder
alias ~="cd ~"                              # ~:            Go Home
alias c='clear'                             # c:            Clear terminal display
alias which='type -all'                     # which:        Find executables
alias path='echo -e ${PATH//:/\\n}'         # path:         Echo all executable Paths
mcd() { mkdir -p "$1" && cd "$1"; }         # mcd:          Makes new Dir and jumps inside
trash() { command mv "$@" ~/.Trash ; }      # trash:        Moves a file to the MacOS trash
ql() { qlmanage -p "$*" >& /dev/null; }     # ql:           Opens any file in MacOS Quicklook Preview
wallpaper() {
    sqlite3 ~/Library/Application\ Support/Dock/desktoppicture.db "update data set value = '$1'" && killall Dock 
}
alias web="open -n"
google() {
    query=""
    for term in $@; do
        query="${query}${term}+"
    done
    url="http://www.google.com/search?q=${query}"
    open $url
}


mov-to-mp4() {
    ffmpeg -i $1 -vcodec h264 -acodec mp2 ${1/.mov/.mp4}
}

#   lr:  Full Recursive Directory Listing
#   ------------------------------------------
# alias lr='ls -R | grep ":$" | sed -e '\''s/:$//'\'' -e '\''s/[^-][^\/]*\//--/g'\'' -e '\''s/^/   /'\'' -e '\''s/-/|/'\'' | less'
# just use 'tree'





### OLD ###

# Courses
alias c403='cd ~/Desktop/Courses/403\ Robotics'
alias c590='cd ~/Desktop/Courses/590G\ Game\ Prog'
alias cIS='cd ~/Desktop/Courses/IS'

# 403 Robotics
alias robs='./simulator 1 1'
alias robc='make; ./roger 127.0.0.1 8000'
alias roger='cd ~/Desktop/Courses/403\ Robotics/roger-2019/RogerProjects; ../RogerSimulator/simulator 1 1 & make && ./roger 127.0.0.1 8000'
alias arena='
    make && ../RogerSimulator/simulator 0 2 0 &
    sleep 1
    ./roger 127.0.0.1 8000 &
    sleep 1
    : $(./roger 127.0.0.1 8001)'
alias arenacompare='
    make && ../RogerSimulator/simulator 0 2 0 &
    sleep 1
    ./roger 127.0.0.1 8000 &
    sleep 1
    : $(./roger\ copy 127.0.0.1 8001)'
alias arenacompete='
    make && cd ../Compete && make && cd ../RogerProjects && ../RogerSimulator/simulator 0 2 0 &
    sleep 1
    ../RogerProjects/roger 127.0.0.1 8000 &
    sleep 1
    : $(../Compete/roger 127.0.0.1 8001)'
alias arenas='
    make && ../RogerSimulator/simulator 0 2 0 &
    sleep 1
    ./roger 127.0.0.1 8000'
alias arenac='make && ./roger 127.0.0.1 8001'
