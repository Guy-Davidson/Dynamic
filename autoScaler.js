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
        console.log(`inQueue currently has: ${queue.length} jobs waiting to execute.`);
        if(queue.length) {
            let mid = Math.floor(queue.length / 2)
            if(queue[mid] && (Date.now() - queue[mid].createdAt) / 1000 > THRESHOLD && count.workers < WORKERS_LIMIT) {            
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
