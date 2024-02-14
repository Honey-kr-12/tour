const mongoose = require('mongoose');
const validator = require('validator');

const tourSchema = new mongoose.Schema({
    name:{ 
      type:String,
      required:[true,'A tour must have the name'],
      unique:true,
      // maxLength:[40,'A tour must have less or equal to 40 character'],
      // minLength:[10,'A tour must have more or equal to 40 character'],
      // validate:[validator.isAlpha,'a tour name contain only alphabets']
    },
    slug:String,
    duration:{
      type:Number,
      required:[true,'A tour must have the durationn']
    },
    maxGroupSize:{
      type:Number,
      required:[true,'A tour must have the group size']
    },
    difficulty:{
      type:String,
      required:[true,'A tour must have the difficulty'],
      enum: {
        values:['easy','medium','difficult'],
        message: 'difficulty is either  easy, medium, difficult '
      }
    },
    ratingsAverage:{
      type:Number,   
      default:4.2,
      max:[5,'A tour must have rating less than 5.0'],
      min:[1,'A tour must have rating more than 1.0']
    },
    ratingsQuantity:{
      type:Number,
      default:0
    },
    price:{
      type:Number,
      required:[true,'A tour must have the price']
    },
    priceDiscount:{
      type:Number,
      validate:{
        validator:function (val) {
          return val < this.price;     // 100 < 200     //discount hamesa kam rhega actual price se
        },
        message:'discount price ({VALUE}) should be below regular price'
      }
    },
    summary:{
      type:String,
      trim:true,
      required:[true,'A tour must have the description']
    },
    description:{
      type:String,
      trim:true
    },
    imageCover:{
      type:String,
      // required:[true,'A tour must have the cover image']
    },
    images:[String],
    createdAt:{
      type:Date,
      default:Date.now(),
      select:false
    },
    startDates:[Date],
    secretTour:{
      type: Boolean,
      default: false
    },
    startLocation:{
      // geo location
      type:{
        type:String,
        default:'point',
        enum:['point']
      },
      coordinates:[Number],
      address:String,
      description:String,
    },
    locations: [ 
      {
        type:{
          type:String,
          default:'point',
          enum:['point']
        },
        coordinates:[Number],
        address:String,
        description:String,
        day:Number
      }
    ],
    guides:[
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ],
  },
  {
    toJSON: { virtuals:true },
    toObject: { virtuals:true }
  });

  tourSchema.index({ startLocation: '2dsphere' })

tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

// virtual populate
tourSchema.virtual('reviews',{
  ref: 'Review',
  foreignField:'tour',
  localField:'_id'
});

tourSchema.pre(/^find/, function(next){
  this.populate({
    path:'guides',
    select: '-__v -passwordChangedAt -passwordResetExpires -passwordResetToken'
  });
  next();
})

// tourSchema.pre('save', async function(next){
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises)
//   next();
// })

// //document middleware  
// tourSchema.pre('save', function(next){
//   this.slug = slugify(this.name, { lower: true });
//   this.start = Date.now();
//   next();
// });

// //query middleware
// tourSchema.pre(/^find/, function(next){
//   this.find({ secretTour: { $ne: true } });
//   this.start = Date.now();
//   next();
// });

// tourSchema.post(/^find/, function(docs,next){
//   console.log(`Query took ${Date.now() - this.start} millisecond`)
//   next();
// });

// // aggrigation middleware
// tourSchema.pre('aggregate', function () {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } } );   
// })
  
const Tour = mongoose.model('Tour',tourSchema);

module.exports = Tour;