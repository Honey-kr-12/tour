const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util')
const User = require('../models/userModels');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET,{expiresIn : process.env.JWT_EXPIRES_IN})
}

const createSSendToken = (user,statusCode, res) => {
    const token = signToken( user._id);
    const cookieOption = {
        expires: new Date( Date.now() + process.env.JWT_COOKIE_EXPIRES_IN *24*60*60*1000 ),
        httpOnly:true
    };

    if (process.env.NODE_ENV === 'production') cookieOption.secure = true; 

    res.cookie('jwt', token, cookieOption);

    // remove password from output
    user.password = undefined;

    res.status(statusCode).json({
        status:'success',
        token,
        data:{
            user
        }
    });
}

exports.signup = catchAsync(async (req,res,next) => {
    const newUser = await User.create(req.body);

    createSSendToken(newUser,201,res)

});

exports.login = catchAsync(async(req,res,next) => {
    const { email, password } = req.body;

    //check if email and password exist
    if (!email || !password) {
        return next(new AppError('please provide email and password',400))
    }

    //check if user exist and password is correct
    const user = await User.findOne({ email }).select('+password');
    
    // const correct =  await user.correctPassword(password,user.password);

    if (!user || !(await user.correctPassword(password,user.password))) {
        return next(new AppError('incorrect email or password',401))
    }   

    //if everything OK send response to client 
    createSSendToken(user,200,res);

}); 

exports.protect = catchAsync(async (req,res,next)=>{
    // getting token and check it's there
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1]; 
    }
    if (!token) {
        return next(new AppError('you are not logged in please login to get access',401))
    }

    // verification token
    const decoded = await promisify(jwt.verify)(token,process.env.JWT_SECRET);
    console.log(decoded);

    //check if user still exist
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError('the user belonging to this token is no longer exist',401))
    }

    // // check if user changed password after the token was issued
    // if (!currentUser.changePasswordAfter(decoded.iat)) {
    //     return next(new AppError('the user recently changed password please login again',401));
    // }

    // grant access to protect route
    req.user = currentUser; 
    next();
});

exports.restrictTo = (...roles) => {
    return (req,res,next)=>{
        // roles ['admin','lead-guide'] 
        if (!roles.includes(req.user.role)) {
            return next(new AppError('you have not the permission to do this action',403));
        }
        next();
    }
}

exports.forgotPassword = catchAsync(async (req,res,next) => {
    // get user by POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('there is no user with this email',404));
    }

    // generate the random reset token
    const resetPasswordToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // send it to user's email
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetPasswordToken}`;

    const message = `Forgot Ypur Password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\n If you didn't forgot your password, please ignore this email`

    try {
        await sendEmail({
            email:user.email,
            subject:'your password reset token (valid for 10 min)',
            message
        });
    
        res.status(200).json({
            status:'success',
            message: 'token send to email'
        });    
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new AppError('there was an error sending by email. Try again later !',500));
    }
});
exports.resetPassword = catchAsync (async (req,res,next) => {
    // get user based on the token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    console.log('third console',hashedToken);
    const user = await User.findOne({ passwordResetToken : hashedToken, passwordResetExpires: { $gt: Date.now() }});
    console.log('fourth console',user); 

    // if there is a user and token has not expired, set a new password
    if (!user) {
        return next(new AppError('token is invalid or has expired',400));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // log the user in, send jwt 
    createSSendToken(user,200,res);
});

exports.updatePassword = catchAsync(async (req,res,next) => {
    // get the user from collection
    const user = await User.findById(req.user.id).select('+password');

    // check if POSTed current password is correct
    if(!(await user.correctPassword(req.body.passwordCurrent, user.password))){
        return next(new AppError('your current password is wrong',401));
    };

    // if so, update password   
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    // log user in send jwt
    createSSendToken(user, 200, res);
    
})