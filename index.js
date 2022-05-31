const fs = require('fs')
const express = require('express');
const fileUpload = require('express-fileupload')
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const {initAutoScaler, count} = require('./autoScaler');
const axios = require('axios');

const app = express();
app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(fileUpload())

const inQueue = []
// initAutoScaler(inQueue)
const outQueue = []

app.get('/', (req, res) => {    
    res.send(`<h1>Cloud Computing Dynamic System</h1>`)
})

app.put('/enqueue', (req, res) => {
    try { 
        const id = uuidv4()                    
        inQueue.push({
            iterations: req.query.iterations,
            binaryDataBuffer: req.files.data.data,
            id: id,
            createdAt: Date.now()
        })        
        res.send(id)
    } catch (error) {
        handleError(error); 
    } 
})

app.get('/dequeue', (req, res) => {
    console.log("dequeue in action.");
    try {         
        if(!inQueue.length) {
            res.send("empty")
        } else {
            const job = inQueue.shift()
            res.send(job)
        }
    } catch (error) {
        handleError(error); 
    } 
})

app.put('/enqueueCompleted', (req, res) => {
    console.log(`enqueueCompleted in action.`)
    try { 
        outQueue.push(req.body)
        res.send("ok")        
    } catch (error) {
        handleError(error); 
    } 
})

app.post('/pullCompleted', async (req, res) => {    
    try {

        let top = parseInt(req.query.top)
        let compJobs = []

        while(top && outQueue.length) {
            compJobs.push(outQueue.shift())    
            top--
        }

        if(top) {
            let ipsArr = fs.readFileSync('../ips.txt', 'utf8')   
                .replace('\n','')
                .trim()
                .split(',')
                .map(ip => ip.split(':')[1])
                console.log(ipsArr);

                exec('curl https://checkip.amazonaws.com', async (err, ipstdout, stderr)=> {
                    if (err) console.log("Error", err) 
                    else {
                        let myIp = ipstdout.slice(0, ipstdout.length - 1)                        
                        
                        //on A otherIp refers to B, and vice versa. 
                        let otherIp = ipsArr.filter(ip => ip !== myIp)[0]

                        console.log(myIp);
                        console.log(otherIp);

                        await axios                            
                            .post(`http://${otherIp}:5000/internalPullCompleted?top=${top}`) 
                            .then(res => {
                                console.log(`res.data is: ${res.data}`);
                                compJobs = compJobs.concat(res.data)
                                res.send(compJobs)        
                            })
                            .catch(e => console.log(e))

                    }
                })
        }

        res.send(compJobs)        

    } catch (error) {
        handleError(error); 
    } 
})

app.post('/internalPullCompleted', (req, res) => {    
    try { 
        let top = parseInt(req.query.top)
        let compJobs = []
        console.log(`top is: ${top}`);

        while(top && outQueue.length) {
            compJobs.push(outQueue.shift())    
            top--
        }
        
        res.send(compJobs)        
    } catch (error) {
        handleError(error); 
    } 
})

app.get('/info', (req, res) => {
    res.send(`inQueue.length: ${inQueue.length}, outQueue.length: ${outQueue.length}, lunched: ${count.workers} workers.`)
})

const PORT = process.env.PORT || 5000

const handleError = (err) => {
    console.log(err);
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)  
}) 
