const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ibexEdu Courses API',
      version: '1.0.0',
      description: 'API for retrieving and searching Litmos courses'
    },
    servers: [
      {
        url: 'http://192.168.18.70:5000',
      }
    ]
  },
  apis: ['./routers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;