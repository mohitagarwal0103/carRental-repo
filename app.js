const express=require('express');
const handlebars = require('handlebars');
const exphbs=require('express-handlebars');
const mongoose=require('mongoose');
const bodyParser=require('body-parser');
const session=require('express-session');
const cookieParser=require('cookie-parser');
const passport=require('passport');
const bcrypt=require('bcryptjs');
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access')
const formidable=require('formidable');
const socketIO=require('socket.io');
const http=require('http');
const keys=require('./config/keys');
const stripe=require('stripe')(keys.StripeApi);
const axios = require('axios').default;
const app=express();
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(function (req, res, next) {
   res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});

app.use(cookieParser());
app.use(session({
    secret: 'mysecret',
    resave: true,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());
const {requireLogin,ensureGuest}=require('./helpers/authHelper');
const {upload}=require('./helpers/aws');
require('./passport/local');
require('./passport/facebook');
app.use((req,res,next)=>{
    res.locals.user=req.user||null;
    next();
});
const keys= require('./config/keys');
const User = require('./models/user');
const Contact = require('./models/contact');  
const Car = require('./models/car');
const Budjet=require('./models/budjet');
const { Budgets } = require('aws-sdk');

mongoose.connect('mongodb+srv://rohitagarwal2207:RVmDTUy6p8sxxBd9@cluster0.gskudpg.mongodb.net/',{
    useNewUrlParser: true
},()=>{
    console.log('MongoDB is connected');
});
// handlebars.registerHelper('carFilter', function(cars, filters, options) {
//     const filteredCars = cars.filter(car => {
//         return (!filters.model || car.model.toLowerCase() === filters.model.toLowerCase()) &&
//                (!filters.color || car.color.toLowerCase() === filters.color.toLowerCase());
//     });

//     // Execute the block of code for each filtered car
//     return filteredCars.map(car => options.fn(car)).join('');
// });
handlebars.registerHelper('toUpperCase', function(text) {
    return text.toUpperCase();
  });
app.engine('handlebars',exphbs.engine({
   
    defaultLayout: 'main',
    handlebars: allowInsecurePrototypeAccess(handlebars)
}));

app.set('view engine','handlebars');
app.use(express.static('public'));


app.get('/',ensureGuest,(req,res)=>{
    res.render('home');
});

// app.get('/previos_booking',requireLogin,(req,res)=>{
//     Car.find({})
//     .populate('owner')
//     .sort({date:'desc'})
//     .then((cars)=>{
//         const today = new Date();
//         console.log("jkkk" , today);
//         const availableCars = cars.filter(car => car.availDate < today);
        
//         res.render('showCars',{
//             cars:availableCars
//         })
//     })
//     //res.render('previous');
// });

app.get('/about',ensureGuest,(req,res)=>{
    res.render('about',{
        title: 'About'
    });
});

app.get('/contact',requireLogin,(req,res)=>{
    res.render('contact',{
        title: 'Contact us'
    });
});

app.post('/contact',requireLogin,(req,res)=>{
   // console.log(req.body);
    const newContact = {
        name: req.user._id,
        message: req.body.message
    }
    new Contact(newContact).save((err,user)=>{
        if(err){
            throw err;
        }
        else{
            res.render('thankYou')
        }
    });
});

app.get('/signup',ensureGuest,(req,res)=>{
    res.render('signupForm',{
        title: 'Register'
    });
});

app.post('/signup',ensureGuest,(req,res)=>{
   let errors=[];
   if(req.body.password!==req.body.password2){
    errors.push({text: 'Password does not match!'});
   }
   if(req.body.password.length<5){
    errors.push({text: 'Password must be at least 5 characters!'});
   }
   if(errors.length>0){
    res.render('signupForm',{
        errors: errors,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber
    });
   }else{
    User.findOne({email:req.body.email})
    .then((user)=>{
        if(user){
            let errors=[];
            errors.push({text:'Email already exist!'});
            res.render('signupForm',{
                errors: errors,
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                phoneNumber: req.body.phoneNumber
            });
        }else{
            let salt=bcrypt.genSaltSync(1);
            let hash=bcrypt.hashSync(req.body.password,salt);

            const newUser={
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                password: hash,
                email: req.body.email,
                phoneNumber: req.body.phoneNumber
            }
        new User(newUser).save((err,user)=>{
                if(err){
                    throw err;
                }
                if(user){
                    let success=[];
                    success.push({text: 'You successfully created an account! You can login now'});
                    res.render('loginform',{
                        success:success
                    })
                }
            });
         }
    })
   }
});

app.get('/displayLoginForm',ensureGuest,(req,res)=>{
    res.render('loginform',{
        title:'Login'
    });
});


app.post('/login',passport.authenticate('local',{
    successRedirect: '/profile',
    failureRedirect: '/loginErrors'
}));
// app.get('/auth/facebook', passport.authenticate('facebook', { 
//     scope : ['email'] 
// }));
// app.get('/auth/facebook/callback',passport.authenticate('facebook',{
//     successRedirect: '/profile',
//     failureRedirect: '/'
// }));

app.get('/profile',requireLogin,(req,res)=>{
    User.findById({_id:req.user._id})
    .then((user)=>{
        user.online=true;
        user.save((err,user)=>{
            if(err){
                throw ree;
            }
            if(user){
                res.render('profile',{
                    user:user,
                    title:'Profile'
                });
            }
        })
    });
});

app.get('/loginErrors',(req,res)=>{
    let errors=[];
    errors.push({text:'User not found or password incorrect!'});
    res.render('loginForm',{
        errors:errors,
        title:'Error'
    });
});

app.get('/listCar',requireLogin,(req,res)=>{
    res.render('listCar',{
        title: 'Listing'
    });
});

app.post('/listCar',requireLogin,(req,res)=>{
    const newCar={
        owner: req.user._id,
        make: req.body.make,
        model: req.body.model,
        year: req.body.year,
        type: req.body.type
    }
    new Car(newCar).save((err,car)=>{
        if(err){
            throw err;
        }
        if(car){
            res.render('listCar2',{
                googleapi: keys.GoogleApi,
                title: 'Finish',
                car: car
            });
        }
    })
});

app.post('/listCar2',requireLogin,(req,res)=>{
     Car.findOne({_id:req.body.carID})
    .then( async ( car)=>{
        let url={
            imageUrl: `https://yash-agarwal.s3.ap-south-1.amazonaws.com/${req.body.image}`
        };
        car.pricePerHour=req.body.pricePerHour;
        car.pricePerWeek=req.body.pricePerWeek;
        car.location=req.body.location;
        car.picture=`https://yash-agarwal.s3.ap-south-1.amazonaws.com/${req.body.image}`;
        car.image.push(url);
     
        let {data} =  await axios.post(`https://maps.googleapis.com/maps/api/geocode/json?address=${req.body.location}&key=${keys.GoogleApi}`)
            car.coords.lat=data.results[0].geometry.location.lat;
            car.coords.lng=data.results[0].geometry.location.lng;
        car.save((err,car)=>{
            if(err){
                throw err;
            }
            if(car){
                res.redirect('/showCars');
            }
        })
    })  
});

app.get('/showCars',requireLogin,(req,res)=>{
    Car.find({})
    .populate('owner')
    .sort({date:'desc'})
    .then((cars)=>{
        const today = new Date();
        //console.log("jkkk" , today);
        const availableCars = cars.filter(car => car.availDate < today);
        
        res.render('showCars',{
            cars:availableCars
        })
    })
})

app.post('/uploadImage',requireLogin,upload.any(),(req,res)=>{
    const form=new formidable.IncomingForm();
    form.on('file',(field,file)=>{
       console.log(file);
    });
    form.on('error',(err)=>{
        console.log(err);
    });
    form.on('end',()=>{
        console.log('Image received successfully..');
    });
    form.parse(req);
});



app.get('/logout',(req,res)=>{
    // console.log(req.user);
    User.findById({_id:req.user._id})
    .then((user)=>{
        user.online=false;
        user.save((err,user)=>{
            if(err){
                throw err;
            }
            if(user){
                req.logout(function(err) {
                    if (err) { return next(err); }
                    res.redirect('/');
                });
            }
        });
    });
});

app.get('/openGoogleMap',(req,res)=>{
    res.render('googlemap',{
        googleapi:keys.GoogleApi
    });
});

app.get('/displayCar/:id',(req,res)=>{
    Car.findOne({_id:req.params.id}).then((car)=>{
        res.render('displayCar',{
            car:car
        });
    })
});

app.get('/contactOwner/:id',(req,res)=>{
    User.findOne({_id:req.params.id})
    .then((owner)=>{
        res.render('ownerProfile',{
            owner:owner
        })
    })
});

app.get('/RentCar/:id',(req,res)=>{
    Car.findOne({_id:req.params.id})
    .then((car)=>{
        res.render('calculate',{
            car:car
        });
    });
});

app.post('/calculateTotal/:id',(req,res)=>{
    Car.findOne({_id:req.params.id})
    .then((car)=>{
      //  console.log(req.body);
        var hour=parseInt(req.body.hour);
        var week=parseInt(req.body.week);
        var totalHours=hour*car.pricePerHour;
        var totalWeeks=week*car.pricePerWeek;
        var total=totalHours+totalWeeks;
        var duration = week;
        const budjet={
            carID:req.params.id,
            total: total,
            duration :duration,
            renter: req.user._id,
            date: new Date()
        }

        new Budjet(budjet).save((err,budjet)=>{
            if(err){
                console.log(err);
            }
            if(budjet){
                Car.findOne({_id:req.params.id})
                .then((car)=>{
                    var stripeTotal=budjet.total*100;
                    res.render('checkout',{
                        budjet:budjet,
                        car: car,
                        stripeTotal: stripeTotal
                    })
                })
            }
        })
    })
})

app.post('/chargeRenter/:id',(req,res)=>{
   Budjet.findOne({_id:req.params.id})
   .populate('renter')
   .then((budjet)=>{
       const amount=budjet.total*100;
       stripe.customers.create({
        email: req.body.stripeEmail,
        source: req.body.stripeToken
       })
       .then((customer)=>{
        stripe.paymentIntents.create({
            amount:amount,
            description: `$${budjet.total} for renting a car`,
            currency: 'usd',
            customer: customer.id,
            receipt_email: customer.email
        },(err,charge)=>{
            if(err){
                console.group(err);
            }
            if(charge){
                
                Car.findOne({_id:budjet.carID})
                .then((car)=>{
                    var week = budjet.duration;
                    var p1 = car.pricePerWeek;
                    var p2 = budjet.total;
                    var p3 = (p2-p1*week)/(car.pricePerHour);
                    var currentDate = new Date();
                    currentDate.setDate(currentDate.getDate() +week*7); // Adds 7 days to the current date
                    currentDate.setHours(currentDate.getHours() + p3 ); // Adds 3 hours to the current time
                    Car.updateOne({_id:budjet.carID} , {availDate:currentDate}, function (err, result) {
                        if (err){
                            console.log(err)
                        }else{
                            console.log("Result :", result) 
                        }
                    })
                    // car.availDate = currentDate;
                })
              //  console.log(charge);
              //  console.log(budjet);
                res.render('success',{
                    charge:charge,
                    budjet:budjet
                })
            }
        })
       })

   }) 
})

const server=http.createServer(app);
const io=socketIO(server);
io.on('connection',(socket)=>{
    console.log('Connected to Client');
  socket.on('ObjectID',(onecar)=>{
     //   console.log('one car is ',onecar);
        Car.findOne({_id: onecar.carID})
        .then((car)=>{
            // console.log(car);
            socket.emit('car',car);
        });
    });

    Car.find({})
    .then((cars)=>{
        const today = new Date();
const availableCars = cars.filter(car => car.availDate <= today);
        //    console.log(availableCars);
        socket.emit('allcars',{cars:availableCars});
    });
  socket.on('disconnect',(socket)=>{
        console.log('Disconnected from Clinet');
    });
});
const port=process.env.PORT || 3000;

server.listen(port,()=>{
    console.log('server is running');
});


    // socket.on('LatLng',(data)=>{
    //     // console.log(data);
    //     // console.log("klkkkkkkkkkkkkkkkk");
    //     Car.findOne({owner:data.car.owner})
    //     .then((car)=>{
    //         // car.coords.lat=data.car.coords?.lat;
    //         // car.coords.lng=data.car.coords?.lng;
    //         car.coords.lat=data.data.results[0].geometry.location.lat;
    //         car.coords.lng=data.data.results[0].geometry.location.lng;
    //         car.save((err,car)=>{
    //             if(err){
    //                 throw err;
    //             }
    //             if(car){
    //               //  console.log("lat lng updated");
    //             }
    //         });
    //     });
    // });