const path = require('path');
const express = require('express');
const morgan = require('morgan');
const AppError = require('./starter/utils/appError'); 
const globalErrorHandler = require('./starter/controllers/errorController')
const tourRouter = require('./starter/routes/tourRoutes');
const userRouter = require('./starter/routes/userRoutes');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const reviewRouter = require('./starter/routes/reviewRoutes');
const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));


app.use(express.static(path.join(__dirname, 'starter/public')));

// set security HTTP header
app.use(helmet())

if (process.env.NODE_ENV === 'devolopment') {
    app.use(morgan('dev'))
};

// limit request from same api
const limiter = rateLimit({
    max:10,
    windowMs: 60 * 60 * 1000,
    message: 'Too much request drom this IP, please try again in an hour'
});

app.use('/api', limiter);

// body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

// serving static files
app.use(express.static(`${__dirname}/starter/public`));

// data sanitization against NOSQL query injection
app.use(mongoSanitize());

// data sanitization against xss
app.use(xss());

// prevent parameter pollution
app.use(hpp({
    whitelist: ['duration','ratingsAverage','ratingsQuantity', 'maxGroupSize','difficulty','price']
}));

// app.get('/', (req,res) => {
//     res.status(200).send('hello from this side');
// });
// app.get('/home', (req,res) => {
//     res.status(200).json({message : 'hello from this home', app : 'natours'});
// });

// app.post('/', (req,res) => {
//     res.status(200).send('hello` endpoint');
// }); 

app.get('/', (req, res) => {
    res.status(200).render('base');
});

app.use('/api/v1/tours',tourRouter);
app.use('/api/v1/users',userRouter);
app.use('/api/v1/reviews',reviewRouter);

app.all('*',(req,res,next)=>{
    // const err = new Error(`cant find ${req.originalUrl} on this server`);
    // err.status = 'fail';
    // err.statusCode = 404;

    next(new AppError(`cant find ${req.originalUrl} on this server`,404));
});

app.use(globalErrorHandler);

module.exports = app;
  