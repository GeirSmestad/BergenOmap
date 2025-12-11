# Justfile for BergenOmap deployment actions
#
# Prerequisities:
# - SSH access configured for host 'bergenomap' (see README.md)
# - 'just' installed
# - 'python' or 'python3' available in PATH
# - 'scp' and 'ssh' available in PATH

set shell := ["bash", "-c"]

# Configuration
server := "bergenomap"
remote_path := "/srv/bergenomap"
service_name := "bergenomap"
python := if os() == "windows" { "python" } else { "python3" }
timestamp := `date +%Y%m%d-%H%M%S`

default:
    @just --list

# SCP my app to the server without the database + restart
deploy-app:
    @echo "Deploying app code to {{server}}..."
    scp -r *.html js css backend {{server}}:{{remote_path}}/
    ssh {{server}} "sudo systemctl restart {{service_name}}"
    @echo "App deployment complete."

# SCP just the database to the server + restart
deploy-db:
    @echo "Deploying database to {{server}}..."
    scp data/database.db {{server}}:{{remote_path}}/data/
    ssh {{server}} "sudo systemctl restart {{service_name}}"
    @echo "Database deployment complete."

# SCP my app to the server including database + restart
deploy-all:
    @echo "Deploying app code AND database to {{server}}..."
    scp -r *.html js css backend data {{server}}:{{remote_path}}/
    ssh {{server}} "sudo systemctl restart {{service_name}}"
    @echo "Full deployment complete."

# Compress my database for production deploy (creates backup first)
compress-db:
    @echo "Creating backup of database..."
    cp data/database.db "data/database-{{timestamp}}.db"
    @echo "Running compression script..."
    cd utils && {{python}} CompressDbForProductionDeploy.py --method 6 --quality 100
    @echo "Database compressed."

# Download the database file from the server to a local file
fetch-db:
    @echo "Downloading database from {{server}}..."
    scp {{server}}:{{remote_path}}/data/database.db "data/database-from-server-{{timestamp}}.db"
    @echo "Database downloaded to data/database-from-server-{{timestamp}}.db"

# List first access time for all unique IPs that have requested a map
logs-stats:
    @echo "Fetching unique visitor stats from {{server}}..."
    ssh {{server}} "zgrep -h '/api/dal/mapfile/final/' /var/log/nginx/access.log* \
    | awk '{ip=\$1; ts=\$4; gsub(/^\[/,\"\",ts); print ts, ip}' \
    | sort \
    | awk '{ts=\$1; ip=\$2; if(!(ip in first)){first[ip]=ts}} END{for(ip in first) print first[ip], ip}' \
    | sort"
