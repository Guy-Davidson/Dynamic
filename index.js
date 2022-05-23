const fs = require('fs')
const express = require('express');
const app = express();

const ips = fs.readFileSync('ips.txt','utf8')

app.get('/', (req, res) => {    
    res.send(`<h1>You Are Truly the Greatest! ${ips}</h1>`)
})

const PORT = process.env.PORT || 5000

const handleError = (err) => {
    console.log(err);
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)  
  }) 
