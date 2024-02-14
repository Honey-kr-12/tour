// const fs = require('fs');
const { query } = require('express');
const Tour = require('../models/tourModels');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./../controllers/handleFactory');

exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage,price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
  };

// const tours = JSON.parse(fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`));

// exports.checkID = (req,res,next,val) => {
//     console.log(`tour id is ${val}`);
//     if (req.params.id*1 > tours.length) {
//         return res.status(404).json({
//             status:'fail',
//             message:'Invalid ID'
//         });
//     }
//     next(); 
// }


// exports.checkBody = (req,res,next) => {
//     if (!req.body.name || !req.body.price) {
//         return res.status(404).json({
//             status:'fail',
//             message:'missing name or price'
//         });
//     }
//     next(); 
// }

// exports.getAllTours =  catchAsync(async (req,res,next) => {
    
//         // build query
//         // filtering
//         // const queryObj = { ...req.query};
//         // const excludedField = ['page','limit','sort', 'fields'];
//         // excludedField.forEach(el => delete queryObj[el]);

//         // // advance filtering
//         // let queryStr = JSON.stringify(queryObj);
//         // queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

//         // let query = Tour.find(JSON.parse(queryStr));

//         // // sorting
//         // if (req.query.sort) {
//         //     const sortBy = req.query.sort.split(',').join(' ');
//         //     query = query.sort(sortBy);
//         // } else {
//         //     query = query.sort('-createdAt');
//         // }

//         // // field limiting
//         // if (req.query.fields) {
//         //     const fields = req.query.fields.split(',').join(' ');
//         //     query = query.select(fields);
//         // } else {
//         //     query = query.select('-__v'); 
//         // }

//         // // pagination

//         // const page = req.query.page * 1 || 1;
//         // const limit = req.query.limit * 1 || 100;
//         // const skip = (page - 1) * limit;

//         // query = query.skip(skip).limit(limit);

//         // if (req.query.page) {
//         //     const numTours = await Tour.countDocuments();
//         //     if (skip >= numTours) throw new Error('this page does not exist');
//         // }

//         // execute query
//         const featuress = new APIFeatures(Tour.find(),req.query).filter().sort().limitField().paginate();
//         const tours = await featuress.query;

//         res.status(200).json({
//             status:'success',
//             result:tours.length, 
//             data:{
//                 tours
//             } 
//         })
// })
exports.getAllTours = factory.getAll(Tour);

// exports.getTour = catchAsync( async (req,res,next) => {

//        const tour = await Tour.findById(req.params.id).populate('reviews');

//        if (!tour) {
//         return next(new AppError(`NO TOUR IS FOUND BY ${req.params.id} ID`,404))
//        }

//        res.status(200).json({
//         status:'success',
//         data:{
//             tour
//         }
//     })
//     // const id = req.params.id * 1;
//     // const tour = tours.find(el => el.id === id)
// })
exports.getTour = factory.getOne(Tour, { path: 'reviews' })

// exports.createTour = catchAsync(async (req,res,next)=>{
//     const newTour = await Tour.create(req.body);

//     res.status(201).json({
//         status:'success',
//         data: {
//             tour:newTour    
//         }
//     });
// });
exports.createTour = factory.createOne(Tour);

// exports.updateTour = catchAsync(async (req,res,next) => {
//       const tour = await Tour.findByIdAndUpdate(req.params.id,req.body,{
//         new:true,
//         runValidators:true
//       })

//       if (!tour) {
//         return next(new AppError(`NO TOUR IS FOUND BY ${req.params.id} ID`,404))
//        }
        
//     res.status(200).json({
//         status:'success',
//         data: {
//             tour
//         }
//     })
// })
exports.updateTour = factory.updateOne(Tour);

// exports.deleteTour = catchAsync(async (req,res,next) => {

//         const tour = await Tour.findByIdAndDelete(req.params.id);
//         if (!tour) {
//             return next(new AppError(`NO TOUR IS FOUND BY ${req.params.id} ID`,404))
//            }
//         res.status(204).json({
//             status:'success',
//             data: null
//         })
// });

exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req,res,next) => {
        const stats = await Tour.aggregate([
            {
                $match : { ratingsAverage: { $gte : 4.5 } }
            },
            {
                $group: {
                    _id: { $toUpper: '$difficulty' },
                    numTours: { $sum: 1 },
                    numRating: { $sum: '$ratingsQuantity' },
                    avgRating: { $avg: '$ratingsAverage' },
                    avgPrice: { $avg: '$price' },
                    minPrice: { $min: '$price' },
                    maxPrice: { $max: '$price' }
                }
            },
            { 
                $sort:  { avgPrice: 1 }
            },
            // { 
            //     $match:  { _id:  { $ne: 'EASY' } }
            // }
        ]);

        res.status(200).json({
            status:'success',
            data: {
                stats
            }
        });
});

exports.getMonthlyPlan = catchAsync(async  (req,res, next) => {
        const year = req.params.year * 1;

        const plan = await Tour.aggregate([
            {
                $unwind: '$startDates'
            },
            {
                $match: {
                    startDates: {
                        $gte: new Date(`${year}-01-01`),
                        $lte: new Date(`${year}-12-31`),
                    }
                }
            },
            {
                $group: {
                    _id: { $month: '$startDates' },
                    numTourStarts: { $sum: 1 },
                    tours: { $push: '$name' }
                }
            },
            {
                $addFields: { month: '$_id' }
            },
            {
                $project: {
                    _id:0
                }
            },
            {
                $sort: { numTourStarts: -1 }
            },
            {
                $limit: 12 
            }
        ]);
        res.status(200).json({
            status:'success',
            data: {
                plan
            }
        });
});


// /tours-within?distance=233&center=-40,45&unit=mi
// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.11734,-118,113491/unit/mi
exports.getTourWithin = catchAsync(async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

    if(!lat || !lng) {
        next(new AppError('please provide latiude and longitude in the format lat,lng',400))
    }

    const tours = await Tour.find({ startLocation: { $geoWithin: { $centerSphere: [[lng,lat], radius] } } })

    res.status(200).json({
        status:'success',
        result:tours.length,
        data:{
            data:tours
        }
    });
});

exports.getDistance = catchAsync(async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    const multiplier = unit === 'mi' ? 0.000621731 : 0.001;

    if(!lat || !lng) {
        next(new AppError('please provide latiude and longitude in the format lat,lng',400))
    }

    const distances = await Tour.aggregate([ 
        {
            $geoNear: {
                near: {
                    type:'Point',
                    coordinates:[lng * 1, lat * 1 ]
                },
                distanceField: 'distance',
                distanceMultiplier: multiplier
            }
        },
        {
            $project: {
                distance: 1,
                name: 1
            }
        }
    ]);
    res.status(200).json({
        status:'success',
        data:{
            data:distances
        }
    });
});