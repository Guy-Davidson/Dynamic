const fs = require('fs')
const AWS = require('aws-sdk');
AWS.config.region = 'eu-west-1'
const util = require('util')
const execSync = util.promisify(require('child_process').exec)

const ec2 = new AWS.EC2({apiVersion: '2016-11-15'})

const sharedData = {}

const lunchWorker = async (count) => {
    if(!Object.keys(sharedData).length) await initSharedData()

    const { instanceParams, keyname } = sharedData
    ec2.runInstances(instanceParams).promise()                         
    .then((data) => {                                
        const instanceId = data.Instances[0].InstanceId
        console.log("Created instance", instanceId)    
        fs.writeFileSync(`workerId-${count}.txt`, instanceId)   
    
        ec2.waitFor('instanceRunning', { InstanceIds: [instanceId] } , async (err, data) => {
            if (err) console.log(err, err.stack)
            else {                                        
                let newWorkerIP = data["Reservations"][0]["Instances"][0]["PublicIpAddress"]            
                console.log(newWorkerIP);
    
                try {
                    await execSync(`scp -i ${keyname}.pem -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" onWorkerScript.bash ../ips.txt workerId-${count}.txt ubuntu@${newWorkerIP}:/home/ubuntu/`)                                                                                
                    await execSync(`ssh -i ${keyname}.pem -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" ubuntu@${newWorkerIP} "mkdir .aws"`)                                                                                
                    await execSync(`scp -i ${keyname}.pem -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" ../.aws/credentials ../.aws/config ubuntu@${newWorkerIP}:~/.aws/`)                                                                                
                    await execSync(`ssh -i ${keyname}.pem -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" ubuntu@${newWorkerIP} "sudo bash ~/onWorkerScript.bash"`)                                                                                
                    await execSync(`ssh -T -i ${keyname}.pem -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" ubuntu@${newWorkerIP} "cd app && pm2 start index.js"`, {shell:true})
                    console.log(console.log("Worker Lunched successfully."));
                } catch (err) {
                    console.log(err);
                }                                    
            }   
          });
        
    })
    .catch((err) => console.error(err, err.stack))
}

const initSharedData = async () => {
    try {
        const keyData = await ec2.createKeyPair({ KeyName: `Cloud-Computing-${Date.now()}` }).promise()
        let keyname = keyData["KeyName"]
        let keyMaterial = keyData["KeyMaterial"]                 
        fs.writeFileSync(`${keyname}.pem`, keyMaterial, {mode: 0o400}) 

        const { stdout, stderr } = await execSync('curl https://checkip.amazonaws.com')                
        let myIp = stdout.slice(0, stdout.length - 1)                    
        let sgName = `scriptSG-${Date.now()}`
        
        let sgParams = {
            GroupName: sgName,
            Description: "script gen sg",                                    
        }

        const sgData = await ec2.createSecurityGroup(sgParams).promise()
        console.log(sgData)
        const SecurityGroupId = sgData.GroupId                                       
        const paramsIngress = {
            GroupId: SecurityGroupId,
            IpPermissions: [
              {
                IpProtocol: "tcp",
                FromPort: 22,
                ToPort: 22,                                                
                IpRanges: [{ CidrIp: `${myIp}/32` }],
              },
              {
                IpProtocol: "tcp",
                FromPort: 5000,
                ToPort: 5000,
                IpRanges: [{ CidrIp: "0.0.0.0/0" }],
              },
            ],
          }
        
        const authData = await ec2.authorizeSecurityGroupIngress(paramsIngress).promise()
        console.log(authData);
        const instanceParams = {
            ImageId: "ami-08ca3fed11864d6bb", 
            InstanceType: 't2.micro',
            KeyName: keyname,
            MinCount: 1,
            MaxCount: 1,                                                    
            SecurityGroupIds: [SecurityGroupId]
        }
        
        sharedData["instanceParams"] = instanceParams
        sharedData["keyname"] = keyname
    } catch (err) { console.log(err) }
}

module.exports = lunchWorker