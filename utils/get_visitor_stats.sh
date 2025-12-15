zgrep -h '/api/dal/mapfile/final/' /var/log/nginx/access.log* \
| awk '{ip=$1; ts=$4; gsub(/^\[/,"",ts); print ts, ip}' \
| sort \
| awk '{ts=$1; ip=$2; if(!(ip in first)){first[ip]=ts}} END{for(ip in first) print first[ip], ip}' \
| sort
