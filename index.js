const fs = require('fs')
const express = require('express');
const fileUpload = require('express-fileupload')
const { v4: uuidv4 } = require('uuid');
const initAutoScaler = require('./autoScaler')

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

// app.get('/ips', (req, res) => {    

//     const loadIps = async () => {        
//         fs.readFile('../ips.txt', 'utf8' , (err, data) => {
//             if (err) res.send(err)
//             else {
//                 res.send(data)
//             }             
//           })
//     }

//     loadIps()    
// })

let testCounter = 0
app.get('/test', (req, res) => {   
    console.log("test in action");
    testCounter += 1
    res.send(testCounter)
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

const PORT = process.env.PORT || 5000

const handleError = (err) => {
    console.log(err);
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)  
}) 
