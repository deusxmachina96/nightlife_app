var express = require('express');
var request = require('request');
var bcrypt = require('bcryptjs');
var User = require('../models/user_model');
var router = express.Router();


var makeAPIRequest = function(cityName, res) {
  var oauth = {
    consumer_key: process.env.YELP_API_KEY,
    token: process.env.YELP_API_TOKEN,
    consumer_secret: process.env.YELP_API_SECRET,
    token_secret: process.env.YELP_API_TOKEN_SECRET
  };
  var options = {
    url: "https://api.yelp.com/v2/search?term=bar&location=" + encodeURIComponent(cityName),
    oauth: oauth,
    json: true
  };
  request.get(options, function(err, mes, response) {
    if(err) {
      console.log("ERROR: ", err);
    }
    else {
      console.log(response.businesses);
      if(!response.businesses) {
        res.render('cities', {
          error: "City not found"
        });
      }
      else {
        res.render('cities', {
          places: response.businesses
        });
      }
    }
  });
};


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'Nightlife App'
  });
});

router.get('/cities', function(req, res, next) {
  var cityName = req.query.city;
  var places = makeAPIRequest(cityName, res);
});

router.get('/register', function(req, res, next) {
  res.render('register', {
    message: decodeURIComponent(req.query.message)
  });
});

router.post('/register', function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  var salt = bcrypt.genSaltSync(10);
  var hash = bcrypt.hashSync(password, salt);
  var user = new User({
    username: username,
    salt: salt,
    hash: hash
  });
  user.save(function(err) {
    if(err) {
      console.log("Cannot save user, see error: ", err);
    }
  });
  res.redirect('/register?message=Successful%20registration');
});

module.exports = router;
