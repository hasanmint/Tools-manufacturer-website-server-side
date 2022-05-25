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

//JWT Function
function varifyJWT(req, res, next) {
    // console.log('test jwt');
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized Access' });
    }
    const token = authHeader.split(' ')[1];
    // verify a token symmetric
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        next();
    });

}

async function run() {
    try {
        await client.connect();

        const productCollection = client.db('manufacturer-website').collection('products');
        const orderCollection = client.db('manufacturer-website').collection('orders');
        const userCollection = client.db('manufacturer-website').collection('users');


        // dashboard Users
        app.get('/user', varifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);

        })

        //Make Admin
        app.put('/user/admin/:email', varifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requestAccount = await userCollection.findOne({ email: requester })
            if (requestAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);

            } else {
                res.status(403).send({ message: 'Forbidden Access' })
            }

        })


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
        app.get('/ordering', varifyJWT, async (req, res) => {
            const userEmail = req.query.userEmail;
            const decodedEmail = req.decoded.email;
            if (userEmail === decodedEmail) {
                const query = { userEmail: userEmail };
                const orders = await orderCollection.find(query).toArray();
                res.send(orders);
            } else {
                return res.status(403).send({ message: 'forbidden access' })
            }

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