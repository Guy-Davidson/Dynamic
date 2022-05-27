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

                // exec(`sudo bash ~/app/initWorker.bash`, { 'shell': true }, (err, stdout, stderr)=> {
                //     if(err) console.log(err);
                //     else {
                //         console.log(stdout);
                //     }
                // })


                
                ec2.createKeyPair({ KeyName: "Cloud-Computing-123" }, (err, data) => {
                    if (err) console.log("Error", err) 
                    else {
                       
                       let keyname = data["KeyName"]
                       let keyMaterial = data["KeyMaterial"]


                       const instanceParams = {
                            ImageId: "ami-08ca3fed11864d6bb", 
                            InstanceType: 't2.micro',
                            KeyName: keyname,
                            MinCount: 1,
                            MaxCount: 1
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

                                        // exec(`sudo bash ~/app/initWorker.bash ${newWorkerIP}`, { 'shell': true }, (err, stdout, stderr)=> {
                                        //     if(err) console.log(err);
                                        //     else {
                                        //         console.log(stdout);
                                        //     }
                                        // })
                                        
                                        exec(`scp -i ${keyMaterial} -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" onWorkerScript.bash ubuntu@${newWorkerIP}:/home/ubuntu/`,
                                            { 'shell': true }, (err, stdout, stderr)=> {
                                            if(err) console.log(err);
                                            else {
                                                console.log(stdout);
                                                exec(`ssh -i ${keyMaterial} -o "StrictHostKeyChecking=no" -o "ConnectionAttempts=10" -t ubuntu@${newWorkerIP} "sudo bash ~/onWorkerScript.bash"`,
                                                { 'shell': true }, (err, stdout, stderr)=> {
                                                if(err) console.log(err);
                                                else {
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