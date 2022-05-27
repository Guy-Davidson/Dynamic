WORKER_IP=$1 
KEY_PEM=$(sudo find ../ -name 'Cloud-Computing-*')

scp -i $KEY_PEM -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" ../ips.txt ubuntu@${WORKER_IP}:/home/ubuntu/
scp -i $KEY_PEM -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" onWorkerScript.bash ubuntu@${WORKER_IP}:/home/ubuntu/
ssh -i $KEY_PEM -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" -t ubuntu@$WORKER_IP "sudo bash ~/onWorkerScript.bash"