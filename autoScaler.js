const initAutoScaler = async (queue) => {
    while(true) {
        if(queue.length) {
            let mid = Math.floor(queue.length / 2)
            if(queue[mid] && (Date.now() - queue[mid].createdAt) / 1000 > 2) {
                console.log((Date.now() - queue[mid].createdAt) / 1000);
                console.log("should lunch worker");
            }
        } else {
            console.log("no need for new works now");
        }               
        await sleep(1000)
    }
}

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

module.exports = initAutoScaler