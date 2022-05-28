const { spawn } = require('child_process');
const lunchWorker = require('./lunchWorker')

//number of seconds a mid job can wait in queue without lunching a new worker.
const THRESHOLD = 5
//number of seconds in between each queue check.
const SLEEP_DUR = 10
//maximum number of worker lunches.
const WORKERS_LIMIT = 1

const initAutoScaler = async (queue) => {   
    let newWorkersCount = 0 
    spawn('sudo chmod -R 777 .')       
    while(true) {
        console.log("AutoScaler check:");
        console.log(`inQueue currently has: ${queue.length} jobs waiting to execute.`);
        if(queue.length) {
            let mid = Math.floor(queue.length / 2)
            if(queue[mid] && (Date.now() - queue[mid].createdAt) / 1000 > THRESHOLD && newWorkersCount < WORKERS_LIMIT) {            
                console.log("Lunching a new Worker!");
                newWorkersCount += 1                
                lunchWorker()
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

module.exports = initAutoScaler