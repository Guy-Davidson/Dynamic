const fs = require('fs')
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const app = express();

app.get('/', (req, res) => {    
    res.send(`<h1>You Are Truly the Greatest!</h1>`)
})

app.get('/ips', (req, res) => {    

    const loadIps = async () => {        
        fs.readFile('../ips.txt', 'utf8' , (err, data) => {
            if (err) res.send(err)
            else {
                res.send(data)
            }             
          })
    }

    loadIps()    
})

app.put('/enqueue', async(req, res) => {
    try {
        const iterations = req.query.iterations
        const binaryData = req.body
        const id = uuidv4()        

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
