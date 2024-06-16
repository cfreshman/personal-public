# common.sh - common bash aliases

export EDITOR='nano'
alias config='edit -w ~/.bashrc && source ~/.bashrc'
alias config-common='edit -w ~/.bash_sync/common.bash && source ~/.bashrc'
alias config-c='config-common'
alias reconfig='source ~/.bashrc'
alias rg=reconfig

# ARGS
#
# count() {
#     # count number of args in string
#     # : args='a "b c"'; count $args => 2
#     _count() { echo $#; }
#     echo $(eval "_count $@")
#     # echo $(( $(echo "$@" | sed -E 's/("[^"]+")/x/g' | sed -E 's/ //g' | wc -c) - 1 )) # -1 for newline
# }
# expect() {
#     echo "$@"
#     [ $# -ne 2 ] && echo 'expected "expect <comparison str> <message>"' && return 1
#     [ $(bash -c "[[ $1 ]] || echo no") ] && echo "expected \"$2\"" && return 1
# args() {
#     echo "$2"
#     echo $(echo $2 | sed -E 's/([<[][^]>]+.)/"\1"/g')
#     local upper=$(count $(echo "$2" | sed -E 's/([<[][^]>]+.)/"\1"/g'))
#     local lower=$(count $(echo "$2" | sed -E 's/(<[^]>]+.)/"\1"/g' | sed -E 's/\[[^]>]+.//g'))
#     echo $upper $lower
#     expect "$1 -lt $lower || $1 -gt $upper" "${FUNCNAME[1]} $2" || return 1
# }

# COMMON
#
alias y="echo yes"
alias n="echo no"
bool() { local v=0 && [ $1 -eq 0 ] && v=1; return $v; } # usage: bool 1 && echo true
empty() { local v=1 && [ -z $1 ] && v=0; return $v; } # usage: empty "" && echo true
confirm-y() {
    local confirm_result=0
    read -p "$1 (Y/n) " -r
    grep -iq "^[^y]" <<< $REPLY && confirm_result=1
    echo && return $confirm_result
}
confirm-n() {
    local confirm_result=1 
    read -p "$1 (y/N) " -r
    grep -iq "^y" <<< $REPLY && confirm_result=0
    echo && return $confirm_result
}


# COLORS / INIT
#
{
    RED="\e[31m"
    YELLOW="\e[33m"
    GREEN="\e[32m"
    CYAN="\e[96m"
    BLUE="\e[34m"
    PURPLE="\e[94m"
    MAGENTA="\e[35m"
    LIGHT_GRAY="\e[37m"
    DARK_GRAY="\e[90m"
    BLACK="\e[30m"
    OFF="\e[0m"
}
ORDER=($YELLOW $BLUE $RED $GREEN $MAGENTA)
color() {
    # args $# "<i | COLOR> <str>" || return 1
    # expect '$# !== 2' '<i | COLOR> <str>'
    if [ $# != 2 ]
    then echo "expected color <i | COLOR> <str>, received $@" && return 1
    fi
    local color=${ORDER[$(($1 % 5))]}
    echo -e $(printf "$color$2$OFF")
}
color-start() {
    if [ $# != 1 ]; then
        echo "expected color-start <color>, received $@"
        return 1
    fi
    echo -en $(printf "$1")
}
color-end() {
    if [ $# != 0 ]; then
        echo "expected color-end, received $@"
        return 1
    fi
    echo -en $(printf "$OFF")   
}
color-prompt() { PROMPT_HOST_COLOR=$1; }
_list="      
    list - list commands
    ~ - home
    c - clear
    targz-replace - tar & gz in-place
    tag <message> - git tag <message> && git push --tags
    webserver [port] - serve dir
    "
list() {
    echo $_list
}
init-profile() {
    # init-aliases <prompt host color> [additional command list]
    # echo -n "=> sourced "
    # local source=(a l i a s e s)
    # local i=0
    # for letter in $(echo ${source[@]}); do
    #     echo -en $(printf "${ORDER[$((i % 3))]}$letter$OFF")
    #     i=$((i + 1))
    # done
    PROMPT_HOST_COLOR=$1
    _list+=$2
    echo
}
init-profile $GREEN


# from https://natelandau.com/my-mac-osx-bash_profile/
alias cp='cp -iv'
alias mv='mv -iv'
alias mkdir='mkdir -pv'
alias ls='ls -GFh'
alias ll='ls -AlGFh'
cd() { builtin cd "$@"; ls; }
alias cd..='cd ../'
alias ..='cd ../'
alias ...='cd ../../'
alias .3='cd ../../../'
alias .4='cd ../../../../'
alias .5='cd ../../../../../'

# execute commands in parallel & kill with same ^C
par() {
    echo "spawn $# parallel processes"
    local pids=""
    local i=0
    for cmd in "$@"; do
        echo -n "$(color $i "P$i") $cmd "
        local start=$(date +%s)

        # _inner() {
        #     local pid
        #     (sleep 1 && $cmd | while read line
        #         do echo "$(color $i "(P$i)") $line"
        #     done) & pid=$!
        #     echo $pid
        # }
        # local pid=$(_inner)
        # echo $pid
        local pid
        color-start $DARK_GRAY # gray out pid from &
        ($cmd | while read line; do echo "$(color $i "(P$i)") $line"; done) \
        & pid=$!
        color-end
        # && echo "$(color $i "P$i") exited after $(( $(date +%s) - start ))s") \

        # { command1 2>&3 | command2; } 3>&1 1>&2 | command3
        # (
        #     sleep .1 \
        #     && \
        #     { $cmd 2>&3 | \
        #         while read out; do echo "$(color $i "(P$i)") $out"; done; \
        #     } 3>&1 1>&2 | while read err; do echo "$(color $RED "(P$i)") $err"; done \
        #     && echo "$(color $i "P$i") exited after $(( $(date +%s) - start ))s") &
        # (
        #     sleep .1 \
        #     && \
        #     { $cmd 2>&3 | \
        #         while read out; do echo "$(color $i "(P$i)") $out"; done \
        #     } 3>&1 1>&2 | while read err; do echo "$err"; done \
        #     && echo "$(color $i "P$i") exited after $(( $(date +%s) - start ))s") &
        # echo "$(ps -ax | grep $pid)"
        pids+="$pid "
        # pids+="$! "
        i=$(($i + 1))
    done

    trap "echo "" && kill $pids" SIGINT
    echo "waiting for $pids"
    wait $pids
}


# BASIC ALIASES/FUNCTIONS
#
alias devices='arp -a'
alias network='devices'
alias curL='curl -L'
alias datetimestr="date '+%F %T'"
see_port() { lsof -i :$1; }
alias py="python3"
alias py3="python3"
webserver() {
    if [ $# -eq 1 ];
    then python3 -m http.server $1
    else python3 -m http.server 8000
    fi
}


# FILESYSTEM
#
alias mem="du -h --max-depth=1"
symlink() {
    # symlink <src> <dst>
    ln -s $2 $1
}
archive() {
    local src=$1
    local dst=$2
    local port=22
    if [ $# -ge 3 ]; then
        port=$1
        src=$2
        dst=$3
    fi
    rsync -avz --copy-unsafe-links --rsh="ssh -p$port" "$src" "$dst"
}
alias avail_port="ruby -e 'require \"socket\"; puts Addrinfo.tcp(\"\", 0).bind {|s| s.local_address.ip_port }'"


# FILE MANIPULATION
#
gif() {
    # ffmpeg -ss 00:00:00.000 -i $1 -pix_fmt rgb24 -r 10 -s 320x240 -t 00:00:10.000 $(echo $1 | sed -E s/\.[^.]+$/.gif/)
    local out=$(echo $1 | sed -E s/\.[^.]+$/.gif/)
    ffmpeg -i $1 -vf scale=256:-1 -r 20 $out
    convert $out -verbose -coalesce -layers OptimizeFrame $out
    gifsicle -O2 $out -o $out
}


# COMPRESSION
#
targz() { tar -cvzf "$1.tar.gz" "$1"; }
targz-replace() { tar -cvzf "$1.tar.gz" "$1" --remove-files; }
zipf() { zip -r "$1.zip" "$1" ; }
extract() { # Extract most know archives with one command
    if [ -f $1 ] ; then
      case $1 in
        *.tar.bz2)   tar xjf $1     ;;
        *.tar.gz)    tar xzf $1     ;;
        *.bz2)       bunzip2 $1     ;;
        *.rar)       unrar e $1     ;;
        *.gz)        gunzip $1      ;;
        *.tar)       tar xf $1      ;;
        *.tbz2)      tar xjf $1     ;;
        *.tgz)       tar xzf $1     ;;
        *.zip)       unzip $1       ;;
        *.Z)         uncompress $1  ;;
        *.7z)        7z x $1        ;;
        *)           echo "'$1' cannot be extracted via extract()" ;;
         esac
     else
         echo "'$1' is not a valid file"
     fi
}


# PATH PARSING
#
# expects path like:
# | ssh://user:key@host:port/absolute/path/file.ext
# |     proto://
# |     user:key@
# |     host:port
# |     /absolute/path/file.ext
# OR
# | user:key@host:port:relative/path/file.ext
# | [[user[:key]@]host:[port:]]relative/path/file.ext
# OR 
# | user:key@host:relative/path/file.ext
# |
# TODO implement key parsing? or not (haven't used it yet)
#
sub-or-empty() {
    local input=$1
    local sub=$2
    local result=$(echo $input | sed -E $sub)
    if [[ $input == $result ]]
    then echo ""
    else echo $result
    fi
}
-parse-path() {
    # parse-path <path> <user_host_port_path flag str: 0000-1111>
    # TODO fix box.local:sync
    
    # proto like ssh:// => ssh
    local proto=$(sub-or-empty $1 's/^([^:]+):\/\/.*/\1/')
    local rest="${1/$proto:\/\//}"
    # echo ' ' $1 $proto $rest

    # user like cyrus@ => cyrus
    local user=$(sub-or-empty $rest 's/^([^@]*)@.*/\1/')
    rest="${rest/$user@/}"
    # echo ' ' $user $rest

    # host like box.local: => box.local
    # AND
    # port parsing
    # true if rest starts with host:port:
    # true if proto == ssh
    # false otherwise
    local host=$(sub-or-empty $rest 's/^([^:]*):.*/\1/')
    local host_port=$(sub-or-empty $rest 's/^([^:]*:[^:]*:).*/\1/')
    rest="${rest/$host:/}"
    local port=22 # default
    if [[ ! -z $host_port || $proto == 'ssh' ]]; then
        # port like 4444: => 4444 OR 4444 => 4444
        local port=$(sub-or-empty $rest 's/^([^:\/]+).*/\1/')
        rest=$(echo ${rest/$port/} | sed -E 's/^://') # remove optional :
    fi
    # echo ' ' $host $port $rest

    # path like relative/path/file.ext or /absolute/path/file.ext
    local path=$rest

    # if input was user@host (without trailing colon), then host = rest
    if [[ ! -z $user && -z $host ]]; then
        host=$rest
        path=""
    fi

    if [[ -z $user ]]; then user=$USER; fi # default user $USER
    if [[ -z $host ]]; then host=localhost; fi # default host localhost
    if [[ -z $port ]]; then port=22; fi # default port 22

    # path is relative if not empty after clearing ^/*
    local abs_path=""
    if [[ ! -z $(echo $path | sed -E 's/^\/.*//') ]]; then
        abs_path="/home/$user/$path"
    fi

    # construct path output
    case $2 in
        '1000') echo $user ;;
        '1100') echo $user@$host ;;
        '0100') echo $host ;;
        '0010') echo $port ;;
        '1110') echo "ssh://$user@$host:$port" ;;
        '1101') echo $user@$host:$path ;;
        '0001') echo $path ;;
        '1111') echo "ssh://$user@$host:$port$abs_path" ;;
        *) echo "unsupported parse-path output $2 ($1)" ;;
    esac
}
parse-user() { -parse-path $1 1000; }
parse-userhost() { -parse-path $1 1100; }
parse-host() { -parse-path $1 0100; }
parse-port() { -parse-path $1 0010; }
parse-sshuserhostport() { -parse-path $1 1110; }
parse-userhostpath() { -parse-path $1 1101; }
parse-path() { -parse-path $1 0001; }
parse-ssh() { -parse-path $1 1111; }


# REMOTE ACCESS/SYNC
#
alias ssh-setup='ssh-copy-id -i ~/.ssh/id_rsa.pub'
alias ssh-rm='ssh-keygen -R'
ssh-save() {
    local user=$(parse-user $1)
    local host=$(parse-host $1)
    local display="${host/.local/}"
    local port=$(parse-port $1)
    if [ -z "$(grep -E "Host $display$" ~/.ssh/config)" ]; then
        echo -n \
"""
# ssh-save $1
Host $display
    HostName $host
    User $user
    Port $port
""" \
        >> ~/.ssh/config
        echo "wrote configuration to ~/.ssh/config for $display => $1"
        # ssh-setup $host # once host configuration is saved, can just use hostname
    else
        echo "found existing configuration in ~/.ssh/config for $display => $1"
    fi
}
# ssh-path() {
#     # ssh-path <user@host:path> [port]
#     local port=22 && [ $# -ge 2 ] && port=$2
#     local user="$(parse-user $1)"
#     echo "ssh://$(parse-userhost $1):$port/home/$user/$(parse-path $1)"
# }
on() {
    if [ $# -eq 1 ]; then
        local dst=$(parse-sshuserhostport $1)
        # echo "on $dst"

        mkdir -p ~/.bash_function_temp
        (ssh -o PasswordAuthentication=no -o BatchMode=yes "$dst" exit &>~/.bash_function_temp/on & sleep 1 &>/dev/null; kill $!) >>~/.bash_function_temp/on 2>&1
        result=$(cat ~/.bash_function_temp/on)
        # echo $result

        local host=$(parse-host $dst)
        if [[ $result =~ "Could not resolve" || ! $result =~ "No such process" ]]
        then echo $host offline && return 1  # no
        else echo $host online && return 0  # yes
        fi
        # if ping -c 1 -t 1 $host &>/dev/null
        # then
        #     echo $host online
        #     return 0  # yes
        # else
        #     echo $host offline
        #     return 1  # no
        # fi
    else
        echo "expected host"
    fi
}
hostauth() {
    # given user@host:path, set up ssh key for passwordless login if not set up
    for host in $@; do
        local dst=$(parse-sshuserhostport "$host")
        echo "hostauth $dst"
        if ! (empty $dst); then
            ssh -o PasswordAuthentication=no -o BatchMode=yes $dst exit &>/dev/null
            local connect=$(test $? = 0 && echo yes || echo no)
            if [[ $connect =~ 'no' ]]; then
                echo "set up ssh key to access $dst"
                ssh-copy-id -i ~/.ssh/id_rsa.pub $dst
            fi
        fi
    done
}
hostsync() {
    if [ $# -ge 2 ]; then
        local src=$(parse-userhostpath $1)
        local dst=$(parse-userhostpath $2)
        local port=$(parse-port $2)
        if [ $# -ge 3 ]
        then port=$3
        fi
        echo "hostsync $src $dst $port"
        if on $dst; then
            hostauth $1 $2
            # local folder="${src/*\//}"
            # hostcmd $1 "mkdir -pv $(parse-path $dst)"

            src=$([[ $(parse-host $src) =~ 'localhost' ]] && echo $(parse-path $src) || echo $src)
            dst=$([[ $(parse-host $dst) =~ 'localhost' ]] && echo $(parse-path $dst) || echo $dst)

            echo "rsync -avz --copy-unsafe-links --rsh=\"ssh -p$port\" $src $dst"
            rsync -avz --copy-unsafe-links --rsh="ssh -p$port" $src $dst
            echo "fswatch -rL $(parse-path $1)"
            fswatch -rL $(parse-path $1) | (
                while read; do
                    rsync -avz --copy-unsafe-links --rsh="ssh -p$port" $src $dst
                done
                echo "")
        fi
    else
        echo "expected <src> <dst> [port], received $@"
    fi
}
hostcmd() {
    echo "hostcmd $1 \"$2\""
    hostauth "$1"
    echo "hostcmd authorized $(parse-sshuserhostport $1)"
    ssh -t $(parse-sshuserhostport $1) bash -ilc "\"$2\""
}
gitsync() {
    if [ $# -ge 2 ]; then
        local src=$(parse-path $1)
        echo $src
        pushd $src
        src=$(pwd)
        local folder="${src/*\//}"
        local dst="$(parse-ssh $2)/$folder.git"
        local dst_path=$(parse-path $dst)
        echo "gitsync $src $dst"
        if on $dst; then
            hostauth $1
            hostauth $dst

            local host=$(parse-host $dst)
            local git_branch="sync"
            if ! [ -d .git ]; then git init; fi
            git checkout -b "$git_branch" &>/dev/null
            local git_origin="sync->$host"
            local port=$(parse-port $dst)
            if ! [[ $(git remote) =~ "$git_origin" ]]; then
                hostcmd $dst "mkdir $dst_path; cd $dst_path; git init --bare"
                git remote add "$git_origin" $dst
            fi
            _inner() {
                if ! [[ $(git status) =~ "nothing to commit" ]]; then
                    git add -A
                    git stash
                    git pull
                    reconfig
                    git stash pop
                    git commit -m "`date "+%F %T"`"
                    git push -u "$git_origin" "$git_branch"
                # else echo "nothing to commit"
                fi
            }
            echo "syncing $folder branch $git_branch => $git_origin"
            _inner
            fswatch $1 | (
                while read; do _inner; done
                echo "")
        fi
        popd
    else
        echo "expected <src> <dst> [port], received $@"
    fi
}
hostworks() {
    # given dir and host,
    # sync dir/work => host/work and host/out => dir/out
    # can pass only dir if host == user@folder

    local dir
    local host
    local common
    if [ $# -eq 3 ]; then
        common=$3
    fi
    if [ $# -gt 1 ]; then
        dir=$1
        host=$2
    elif [ $# -eq 1 ]; then
        dir=$1
        host="${dir/*\//}"
    else
        echo "expected hostworks dir [user@host] [common lib dir]"
        return 1
    fi

    echo "hostworks $dir $host"
    if (! on $host &>/dev/null); then
        echo "try .local"
        host="$host.local"
    fi
    if (on $host &>/dev/null); then
        # create dirs if they do not already exist
        mkdir $dir/work
        mkdir $dir/out
        hostcmd $host "mkdir out" &>/dev/null
        if ! $(empty $common); then
            mkdir $common
            par \
            "hostsync $common $host" \
            "hostsync $dir/work $host" \
            "hostsync $host:out $dir"
        else
            par \
            "hostsync $dir/work $host" \
            "hostsync $host:out $dir"
        fi
        # hostsync "$dir/work" "$host" &
        # hostsync "$host:out" "$dir" &
        # fg
    fi
}


# GIT
#
alias gr='git remote -v'
# alias grs='echo "Push to remotes"; for i in `git remote`; do echo "| => " $i; git push $i; done;'
grs() {
    local remotes=$(git remote)
    echo -n "Push to remotes"
    local cmds=""
    for i in $remotes; do
        echo -n " $i"
        cmds=$(echo "$cmds \"git push $i\"")
    done
    echo
    bash -ilc "par $cmds"
}
alias grl='echo "Pull from remotes"; for i in `git remote`; do echo "| <= " $i; git pull $i master; done;'
gremote() {
    # add ssh remote
    # gremote <name> ssh://<user>@<host>:<port>/<absolute path>/<name>.git
    local name=$1
    local address=$2

    # create repo directory on remote if it doesn't exist
    local user=$(parse-user $address)
    local dir=$(parse-path $address)
    hostcmd $address \
    "if ! [ -d '$dir' ]; then sudo mkdir -pv '$dir'; cd '$dir'; sudo git init --bare; sudo chown -R $user:$user .; fi"

    # add remote to git
    git remote add $name $address
    # git remote set-url --add origin "ssh://$3@$2:$port$dir"
}
g-init-remotes() {
    # g-init-remotes <name>
    gremote local "ssh://cyrus@box.local:4444/home/cyrus/repo/$1.git"
    gremote box "ssh://cyrus@box.freshman.dev:4444/home/cyrus/repo/$1.git"
    if [[ $INTERNAL_GIT == 'true' ]]; then
        # skip
        echo 'skipping external remotes'
        git push --set-upstream local master
    else
        echo 'enable external remotes'
        gremote drop "ssh://git@freshman.dev:22/home/git/$1.git"
        gremote github "ssh://git@github.com:22/cfreshman/$1.git"
        git push --set-upstream drop master
    fi
}
ginit() {
    if [ $# -ge 1 ]; then
        git init $1
        cd $1
    else
        git init
    fi
    local name=$(basename $(pwd))

    g-init-remotes $name
    grs
}
alias gs='git status'
alias gd='git diff'
alias gh='gd HEAD'
alias gl='git log'
alias ga='git add -A'
alias gad='git add'
alias gc='git commit -m'
alias gi='git rebase -i HEAD^'
alias gu='git restore --staged'
alias gti='git'
git-clear() { git reset HEAD $@ && git checkout -- $@; }
s=git-verbose
git-verbose() {
    if git ls-files >& /dev/null; then
        git branch -avv;
        echo "";
        git status -s
    else
        echo 'This is not a git directory'
    fi
}
alias fix-common='git rebase --committer-date-is-author-date HEAD^ && git push --force'
alias fix-c='git commit --amend && git stash && fix-common && git stash pop'
alias git-fix='fix-c'
alias fix='git add -A && git commit --amend && fix-common'

alias fix-simple='git rebase HEAD^ && git push --force'
alias fix-sc='git commit --amend && git-simple'

alias gp='git push --set-upstream origin'

lazy() {
    if [ $# -eq 1 ]; then
        git add -A
        git commit -m "$1"
        git push -u origin HEAD
    else
        echo "You need a commit message"
    fi
}
laze() {
    if [ $# -eq 1 ]; then
        git add -A
        git commit -m "$1"
        grs
    else
        echo "You need a commit message"
    fi
}
tag() {
    if [ $# -eq 1 ]; then
        git tag "$1"
        git push --tags
    else
        echo "You need a tag"
    fi
}


# MISC
#
alias find_node_modules="find ~ -type d -name node_modules -prune 2>/dev/null | tr '\n' '\0' | xargs -0 du -sch"


# PROMPT
#
parse-git-branch() {
  git branch 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/(\1)/'
}
PROMPT_COMMAND=__prompt_command
PROMPT_HOST_COLOR=$GREEN
__prompt_command() {
    local exit_code="$?"
    if [ ${exit_code} == 0 ]; then
        local exit_code_text=""
    else
        local exit_code_text="$RED[$exit_code]"
    fi

    local timestr="$DARK_GRAY`date +%H:%M:%S` "
    local branch="$(parse-git-branch)"
    if [ ${branch} ]; then
        branch="$LIGHT_GRAY$branch "
    fi

    PS1="\n$PROMPT_HOST_COLOR\u@\h:$YELLOW\w $branch$timestr$exit_code_text$OFF\n\$ "
}
