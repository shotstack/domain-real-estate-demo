require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const shotstack = require('./handler/shotstack/lib/shotstack');
const properties = require('./handler/shotstack/lib/properties');
const address = require('./handler/domain/lib/address');
const responseHandler = require('./shared/response');
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname + '../../../web')));

app.post('/demo/shotstack', async (req, res) => {
    try {
        const property = await properties.get(req.body.propertyId);
        const json = await shotstack.createJson(property);
        const render = await shotstack.submit(json);

        res.header("Access-Control-Allow-Origin", "*");
        res.status(201);
        res.send(responseHandler.getBody('success', 'OK', render));
    } catch (err) {
        res.header("Access-Control-Allow-Origin", "*");
        res.status(400);
        res.send(responseHandler.getBody('fail', 'Bad Request', err));
    }
});

app.get('/demo/shotstack/:renderId', async (req, res) => {
    try {
        const render = await shotstack.status(req.params.renderId);

        res.header("Access-Control-Allow-Origin", "*");
        res.status(200);
        res.send(responseHandler.getBody('success', 'OK', render));
    } catch (err) {
        res.header("Access-Control-Allow-Origin", "*");
        res.status(400);
        res.send(responseHandler.getBody('fail', 'Bad Request', err));
    }
});

app.get('/demo/domain/search/:search', async (req, res) => {
    try {
        const properties = await address.search(req.params.search);

        res.header("Access-Control-Allow-Origin", "*");
        res.status(200);
        res.send(responseHandler.getBody('success', 'OK', properties));
    } catch (err) {
        res.header("Access-Control-Allow-Origin", "*");
        res.status(400);
        res.send(responseHandler.getBody('fail', 'Bad request', err));
    }
});

app.listen(3000, () => console.log("Server running...\n\nOpen http://localhost:3000 in your browser\n"));
