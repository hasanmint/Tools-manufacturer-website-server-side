const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const res = require('express/lib/response');
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
        const userCollection = client.db('doctors-portal').collection('users');


        

        //update and insert
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ result, token });

        })

        //product read
        app.get('/product', async (req, res) => {
            const query = {};
            const curser = productCollection.find(query);
            const products = await curser.toArray();
            res.send(products);
        })


        // //product Read 

        app.get('/ordering', async (req, res) => {
            const userEmail = req.query.userEmail;
            const authorization = req.headers.authorization;
            // console.log('Auth Test', authorization)
            const query = { userEmail: userEmail };
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);
        })

        //product Insert
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