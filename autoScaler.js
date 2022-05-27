const fs = require('fs')
const AWS = require('aws-sdk');
AWS.config.region = 'eu-west-1'
const { exec } = require('child_process');

const ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

//number of seconds a mid job can wait in queue without lunching a new worker.
const THRESHOLD = 5
//number of seconds in between each queue check.
const SLEEP_DUR = 10
//maximum number of workers
const WORKERS_LIMIT = 1

const initAutoScaler = async (queue) => {   
    let newWorkersCount = 0 
    while(true) {
        if(queue.length) {
            let mid = Math.floor(queue.length / 2)
            if(queue[mid] && (Date.now() - queue[mid].createdAt) / 1000 > THRESHOLD && newWorkersCount < WORKERS_LIMIT) {            
                newWorkersCount += 1                

                ec2.createKeyPair({ KeyName: `Cloud-Computing-${Date.now()}` }, (err, keyData) => {
                    if (err) console.log("Error", err) 
                    else {
                       
                        let keyname = keyData["KeyName"]
                        let keyMaterial = keyData["KeyMaterial"]

                        fs.writeFileSync(`${keyname}.pem`, keyMaterial);


                        exec('curl https://checkip.amazonaws.com', (err, ipstdout, stderr)=> {
                            if (err) console.log("Error", err) 
                            else {
                                let myIp = ipstdout
                                let sgName = `scriptSG-${Date.now()}`
                                
                                let sgParams = {
                                    GroupName: sgName,
                                    Description: "script gen sg",                                    
                                }

                                ec2.createSecurityGroup(sgParams, (err, sgData) => {
                                    if (err) console.log("Error", err) 
                                    else {
                                        console.log(sgData);
                                        const SecurityGroupId = sgData.GroupId;                                        
                                        const paramsIngress = {
                                            GroupId: SecurityGroupId,
                                            IpPermissions: [
                                              {
                                                IpProtocol: "tcp",
                                                FromPort: 22,
                                                ToPort: 22,
                                                IpRanges: [{ CidrIp: "0.0.0.0/0" }],
                                              },
                                              {
                                                IpProtocol: "tcp",
                                                FromPort: 5000,
                                                ToPort: 5000,
                                                IpRanges: [{ CidrIp: "0.0.0.0/0" }],
                                              },
                                            ],
                                          };
                                        ec2.authorizeSecurityGroupIngress(paramsIngress, (err, authData) => {
                                            if (err) console.log("Error", err) 
                                            else {
                                                console.log(authData);
                                                const instanceParams = {
                                                    ImageId: "ami-08ca3fed11864d6bb", 
                                                    InstanceType: 't2.micro',
                                                    KeyName: keyname,
                                                    MinCount: 1,
                                                    MaxCount: 1,                                                    
                                                    SecurityGroupIds: [SecurityGroupId]
                                                }
                                            
                                                ec2.runInstances(instanceParams).promise()                         
                                                    .then((data) => {                                
                                                        const instanceId = data.Instances[0].InstanceId
                                                        console.log("Created instance", instanceId)
                        
                                                        ec2.waitFor('instanceRunning', { InstanceIds: [instanceId] } , (err, data) => {
                                                            if (err) console.log(err, err.stack)
                                                            else {                                        
                                                                let newWorkerIP = data["Reservations"][0]["Instances"][0]["PublicIpAddress"]
                        
                                                                console.log(newWorkerIP);
                                                                
                                                                exec(`scp -i ${keyname}.pem -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" onWorkerScript.bash ubuntu@${newWorkerIP}:/home/ubuntu/`, (err, stdout, stderr)=> {
                                                                    if(err) console.log(err);
                                                                    else {
                                                                        console.log("copied script");
                                                                        console.log(stdout);
                                                                        exec(`ssh -T -i ${keyname}.pem -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" ubuntu@${newWorkerIP} "sudo bash ~/onWorkerScript.bash"`, {shell:true},(err, stdout, stderr)=> {
                                                                        if(err) console.log(err);
                                                                        else {
                                                                            console.log("Here: ssh");
                                                                            console.log(stdout);
                                                                        }
                                                                    })
                                                                    }
                                                                })                                        
                                                            }   
                                                          });
                                                        
                                                    })
                                                    .catch((err) => console.error(err, err.stack))
                                            }
                                        })
                                    }
                                })
                            }
                        })
                    }
                 });
                 


            }
        } else {
            console.log("no need for new works now");
        }               
        await sleep(SLEEP_DUR * 1000)
    }
}

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

module.exports = initAutoScaler