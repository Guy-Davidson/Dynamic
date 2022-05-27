# WORKER_IP=$1 
# KEY_PEM=$(sudo find ../ -name 'Cloud-Computing-*')

# scp -i $KEY_PEM -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" ../ips.txt ubuntu@${WORKER_IP}:/home/ubuntu/
# scp -i $KEY_PEM -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" onWorkerScript.bash ubuntu@${WORKER_IP}:/home/ubuntu/
# ssh -i $KEY_PEM -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" -t ubuntu@$WORKER_IP "sudo bash ~/onWorkerScript.bash"


#Get current time in ms to create a unique name.
# $DateTime = (Get-Date).ToUniversalTime() 
# $UnixTimeStamp = [System.Math]::Truncate((Get-Date -Date $DateTime -UFormat %s))
UnixTimeStamp = "123"

KEY_NAME = "Cloud-Computing-" + $UnixTimeStamp
KEY_PEM = $KEY_NAME + ".pem"

#Create key.
# aws ec2 create-key-pair --key-name $KEY_NAME --query 'KeyMaterial' --output text > $KEY_PEM
aws ec2 create-key-pair --key-name $KEY_NAME \
    | jq -r ".KeyMaterial" > $KEY_PEM

# #Create security group.
# $SEC_GRP = "scriptSG-" + $UnixTimeStamp
# aws ec2 create-security-group --group-name $SEC_GRP --description "script gen sg"

# #Create rules for fire wall. (ports 22 & 5000).
# $MY_IP = curl https://checkip.amazonaws.com
# aws ec2 authorize-security-group-ingress `
# 	--group-name $SEC_GRP `
# 	--protocol tcp `
# 	--port 22 `
# 	--cidr $MY_IP/32 
	
# aws ec2 authorize-security-group-ingress `
# 	--group-name $SEC_GRP `
# 	--protocol tcp `
# 	--port 5000 `
# 	--cidr 0.0.0.0/0
	
#Lunch 1 EC2 instance. 
UBUNTU_20_04_AMI="ami-08ca3fed11864d6bb"
RUN_INSTANCES=$(aws ec2 run-instances \
	--image-id $UBUNTU_20_04_AMI \
	--instance-type t2.micro \
	--key-name $KEY_NAME)				

#Fetch instance A ID.
# $RUN_INSTANCES_Convert = $RUN_INSTANCES | ConvertFrom-Json
# $INSTANCE_ID_A = $RUN_INSTANCES_Convert.Instances[0].InstanceId
INSTANCE_ID=$(echo $RUN_INSTANCES | jq -r '.Instances[0].InstanceId')

#Wait for A to run.
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

#Fetch instance A public ip address.
# $Describe_Instances_A = aws ec2 describe-instances --instance-ids $INSTANCE_ID_A
# $Describe_Instances_A_Convert = $Describe_Instances_A | ConvertFrom-Json
# $PUBLIC_IP_A = $Describe_Instances_A_Convert.Reservations[0].Instances[0].PublicIpAddress
PUBLIC_IP=$(aws ec2 describe-instances  --instance-ids $INSTANCE_ID | 
    jq -r '.Reservations[0].Instances[0].PublicIpAddress'
)

# #Wait for B to run.
# aws ec2 wait instance-running --instance-ids $INSTANCE_ID_B

# #Fetch instance B public ip address.
# $Describe_Instances_B = aws ec2 describe-instances --instance-ids $INSTANCE_ID_B
# $Describe_Instances_B_Convert = $Describe_Instances_B | ConvertFrom-Json
# $PUBLIC_IP_B = $Describe_Instances_B_Convert.Reservations[0].Instances[0].PublicIpAddress

# "A:" + ${PUBLIC_IP_A}  > ips.txt

#Copy Required Files to A.
# ssh -i $KEY_PEM -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" ubuntu@$PUBLIC_IP_A "mkdir .aws"
# scp -i $KEY_PEM -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" credentials ubuntu@${PUBLIC_IP_A}:~/.aws/
# scp -i $KEY_PEM -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" config ubuntu@${PUBLIC_IP_A}:~/.aws/

# scp -i $KEY_PEM -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" ips.txt ubuntu@${PUBLIC_IP_A}:/home/ubuntu/

# No passing the key
# scp -i $KEY_PEM -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" $KEY_PEM ubuntu@${PUBLIC_IP_B}:/home/ubuntu/


#Copy & Run bash script on A.
scp -i $KEY_PEM -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" onWorkerScript.bash ubuntu@${PUBLIC_IP}:/home/ubuntu/
ssh -i $KEY_PEM -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" -t ubuntu@$PUBLIC_IP "sudo bash ~/onWorkerScript.bash"
# ssh -i $KEY_PEM -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" ubuntu@$PUBLIC_IP_A "aws configure list" 
# ssh -i $KEY_PEM -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" -t ubuntu@$PUBLIC_IP_A "cd app && pm2 start index.js" 