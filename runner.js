var generateModel = require('./generateModel.js');

process.on('uncaughtException', function (err) {
  console.log(err);
})

//starting point for the application
// readFile then calls a function to train the model
generateModel.readFile();