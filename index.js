const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const { MongoClient, ServerApiVersion, OrderedBulkOperation } = require('mongodb');
const port = process.env.PORT || 5000;

//Middileware
app.use(cors());
app.use(express.json());

//db connection

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cdeb8.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();

        const productCollection = client.db('manufacturer-website').collection('products');
        const orderCollection = client.db('manufacturer-website').collection('orders');

        //product read
        app.get('/product', async (req, res) => {
            const query = {};
            const curser = productCollection.find(query);
            const products = await curser.toArray();
            res.send(products);
        })

        //product ordering
        app.post('/ordering', async (req, res) => {
            const ordering = req.body;
            const result = await orderCollection.insertOne(ordering);
            res.send(result);
        })


    } finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Test Manufacturer website Server !')
})

app.listen(port, () => {
    console.log(`Manufacturer app listening on port ${port}`)
})