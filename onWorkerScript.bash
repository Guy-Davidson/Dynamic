set -x 
mkdir app
cd app
git clone https://github.com/Guy-Davidson/DynamicWorker.git .
sudo apt-get -y update
sudo apt-get -y upgrade
sudo apt-get install -y npm
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm i -g pm2 
npm i
pm2 start index.js
exit