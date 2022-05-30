const fs = require('fs')
const express = require('express');
const fileUpload = require('express-fileupload')
const { v4: uuidv4 } = require('uuid');
const {initAutoScaler, newWorkersCount} = require('./autoScaler')

const app = express();
app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(fileUpload())

const inQueue = []
initAutoScaler(inQueue)
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
    console.log(`enqueueCompleted in action. attempts: ${req.query.attempts}`);
    try { 
        outQueue.push(req.body)
        res.send("ok")        
    } catch (error) {
        handleError(error); 
    } 
})

app.get('/info', (req, res) => {
    res.send(`inQueue.length: ${inQueue.length}, outQueue.length: ${outQueue.length}, lunched: ${newWorkersCount} workers.`)
})

const PORT = process.env.PORT || 5000

const handleError = (err) => {
    console.log(err);
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)  
}) 
