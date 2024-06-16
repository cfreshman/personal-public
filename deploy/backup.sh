tar -czvf /var/www/personal/backups/db-$(date '+%Y-%m-%d') /var/www/personal/data/
rsync -avz --rsh="ssh -p4444" /var/www/personal/backups/ box.freshman.dev:db-backup
