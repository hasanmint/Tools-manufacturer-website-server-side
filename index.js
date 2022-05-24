const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;


//Middileware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Test Manufacturer website Server !')
})

app.listen(port, () => {
    console.log(`Manufacturer app listening on port ${port}`)
})