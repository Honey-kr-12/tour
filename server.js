const dotenv = require('dotenv');
const mongoose = require('mongoose');
const app = require('./app');

process.on('uncaughtException', err => {
  console.log('uncaught EXCEPTION ... shutting down...');
  console.log(err.name,err.message);
  process.exit(1);
});

dotenv.config({path:'./config.env'});

const DB = process.env.DATABASE.replace('<PASSWORD>',process.env.DATABASE_PASSWORD);

mongoose.connect(DB,{
  useNewUrlParser:true,
  useCreateIndex:true,
  useFindAndModify:false  
}).then(() => console.log('DB is connected'));

const port = process.env.PORT || 3000;
const server = app.listen(port,()=>{   
    console.log(`app running on port ${port}...`);
}); 

process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION ... shutting down...');
  console.log(err.name,err.message);
  server.close(()=>{
    process.exit(1);
  })
});



// console.log(x)