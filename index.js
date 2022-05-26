const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const res = require('express/lib/response');
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(express.static("public"));
app.use(express.json());

const calculateOrderAmount = (items) => {
    // Replace this constant with a calculation of the order's amount
    // Calculate the order total on the server to prevent
    // people from directly manipulating the amount on the client
    return 1400;
};

app.post("/create-payment-intent", async (req, res) => {
    const { items } = req.body;

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
        amount: calculateOrderAmount(items),
        currency: "eur",
        automatic_payment_methods: {
            enabled: true,
        },
    });

    res.send({
        clientSecret: paymentIntent.client_secret,
    });
});

app.listen(4242, () => console.log("Node server listening on port 4242!"));


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
        const reviewCollection = client.db('manufacturer-website').collection('reviews');
        const profileCollection = client.db('manufacturer-website').collection('profiles');



        // Admin Varify
        const varifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requestAccount = await userCollection.findOne({ email: requester })
            if (requestAccount.role === 'admin') {
                next();
            } else {
                res.status(403).send({ message: 'Forbidden Access' })
            }
        }

        // dashboard Users
        app.get('/user', varifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);

        })

        //Check Role
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });
        })

        //Make Admin
        app.put('/user/admin/:email', varifyJWT, varifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);

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


        app.post("/create-payment-intent", varifyJWT, async (req, res) => {
            const product = req.body;
            const price = product.price;
            const ammount = price * 100;

            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: ammount,
                currency: "usd",
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });



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


        //Payment
        app.get('/ordering/:id', varifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const ordering = await orderCollection.findOne(query);
            res.send(ordering);
        })

        //Order Insert
        app.post('/ordering', async (req, res) => {
            const ordering = req.body;
            const result = await orderCollection.insertOne(ordering);
            res.send(result);
        })


        //Get Product
        app.get('/product', varifyJWT, varifyAdmin, async (req, res) => {
            const products = await productCollection.find().toArray();
            res.send(products);
        })

        //Add Product
        app.post('/product', varifyJWT, varifyAdmin, async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        })

        //Delete Product
        app.delete('/product/:email', varifyJWT, varifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const result = await productCollection.deleteOne(filter);
            res.send(result);
        })


        // Review
        //insert 
        app.post('/review', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        })

        app.get('/review', async (req, res) => {
            const reviews = await reviewCollection.find().toArray();
            res.send(reviews);
        })


        // Profile
        app.post('/profile', async (req, res) => {
            const profile = req.body;
            const result = await profileCollection.insertOne(profile);
            res.send(result);
        })

        app.get('/profile', varifyJWT, async (req, res) => {
            const profiles = await profileCollection.find().toArray();
            res.send(profiles);
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