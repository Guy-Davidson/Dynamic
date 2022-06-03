const AWS = require('aws-sdk');
AWS.config.region = 'eu-west-1'
const ec2 = new AWS.EC2({apiVersion: '2016-11-15'})
const lunchWorker = require('./lunchWorker')

//number of seconds a mid job can wait in queue without lunching a new worker.
const THRESHOLD = 5
//number of seconds in between each queue check.
const SLEEP_DUR = 10
//maximum number of worker lunches. 
const WORKERS_LIMIT = 3 
let count = { workers: 0 }     

const initAutoScaler = async (queue) => {       
    while(true) {
        console.log("AutoScaler check:");
        const { InstanceStatuses } = await ec2.describeInstanceStatus().promise()        

        if(queue.length) {            
            // -2 in: InstanceStatuses.length - 2 is for A,B machinces. 
            if(queue[0] && (Date.now() - queue[0].createdAt) / 1000 > THRESHOLD && InstanceStatuses.length - 2 < WORKERS_LIMIT) {            
                console.log("Lunching a new Worker!");
                count.workers += 1                
                lunchWorker(count.workers)
            } else { console.log("No need for new works.") }
        } else {
            console.log("No need for new works.");
        }               
        await sleep(SLEEP_DUR * 1000)
    }
}

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {initAutoScaler, count}