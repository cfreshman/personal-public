# wsh.sh - WSL-specific bash aliases

# BASIC ALIASES
#
alias subl="/mnt/c/Program\ Files/Sublime\ Text\ 3/subl.exe"
alias restart="sudo reboot"
alias off="sudo halt"
alias screen-s="sudo mkdir /run/screen; sudo chmod 777 /run/screen" # resolves an issue w/ screen
alias winhome="cd /mnt/c/Users/cyrus"

alias config='edit -w ~/.bash_aliases && source ~/.bashrc'
alias reconfig='source ~/.bashrc'

alias ps1="powershell.exe -File"
alias psh="/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
alias pwsh="/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe Start-Process -Verb runas -FilePath wsl"
