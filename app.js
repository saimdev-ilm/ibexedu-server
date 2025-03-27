const express = require('express')
const cookieParser = require('cookie-parser');
const cors = require("cors");
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const path = require("path");

const app = express();
const corsOptions = {
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST'], 
};
app.use(cors(corsOptions));

app.use(cookieParser());
app.use(express.json());

app.use('/assets', express.static(path.join(__dirname, 'assets')));

const dotenv  = require('dotenv')
dotenv.config({path:'./config.env'});

require('./db/conn');

app.use(require('./routers/auth'));
app.use(require('./routers/courses-sync'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = process.env.PORT;

app.get('/', (req, res) => {
  res.send('GET request to the homepage')
});

app.listen(PORT, ()=>{
    console.log("Server is running on port no.", PORT);
})


