const fs = require('fs')
const AWS = require('aws-sdk');
AWS.config.region = 'eu-west-1'
const { exec } = require('child_process');

const ec2 = new AWS.EC2({apiVersion: '2016-11-15'});

const lunchWorker = () => {
    ec2.createKeyPair({ KeyName: `Cloud-Computing-${Date.now()}` }, (err, keyData) => {
        if (err) console.log("Error", err) 
        else {           
            let keyname = keyData["KeyName"]
            let keyMaterial = keyData["KeyMaterial"]


            exec(`echo=$(${keyMaterial}) > ${keyname}.pem`, {shell:true}, (err, ipstdout, stderr)=> {
                if(err) console.log(err)
                else console.log(keyMaterial);
            })

            return

            
            fs.writeFileSync(`${keyname}.pem`, keyMaterial, {mode: 0o765}, (err) => {
                if(err) console.log(err)
                else console.log(keyMaterial);
            });
            // fs.chmodSync(`${keyname}.pem`, 0o765)

            exec('curl https://checkip.amazonaws.com', (err, ipstdout, stderr)=> {
                if (err) console.log("Error", err) 
                else {
                    let myIp = ipstdout
                    myIp = myIp.slice(0, myIp.length - 1)
                    // fs.writeFileSync(`ips.txt`, `A:${myIp},B:${myIp}`);
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
                                    IpRanges: [{ CidrIp: `${myIp}/32` }],
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
                                                    
                                                    exec(`scp -i ${keyname}.pem -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" onWorkerScript.bash ips.txt ubuntu@${newWorkerIP}:/home/ubuntu/`, (err, stdout, stderr)=> {
                                                        if(err) console.log(err);
                                                        else {
                                                            console.log("scp bash script successfull.");
                                                            console.log("Waiting for Worker to init...");                                                                        
                                                            exec(`ssh -T -i ${keyname}.pem -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" ubuntu@${newWorkerIP} "sudo bash ~/onWorkerScript.bash"`, {shell:true},(err, stdout, stderr)=> {
                                                            if(err) console.log(err);
                                                            else {                                                                            
                                                                console.log("Worker Lunched successfully.");
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

module.exports = lunchWorker