var express = require('express');
var request = require('request');
var bcrypt = require('bcryptjs');
var User = require('../models/user_model');
var router = express.Router();


var makeAPIRequest = function(cityName, req, res) {
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
          error: "City not found",
          user: getUser(req)
        });
      }
      else {
        res.render('cities', {
          places: response.businesses,
          user: getUser(req)
        });
      }
    }
  });
};

var getUser = function(req) {
  return req.session.user;
};

var verifyAccountInfo = function (username, password) {
  var messageText = null;
  if(!username || !password) {
    messageText = "Please enter username and password.";
  }
  else if(username.length < 5 || username.length > 30) {
    messageText = "Username must be between 5 and 30 characters long";
  }
  else if (password.length < 8 || password.length > 30) {
    messageText = "Password must be between 8 and 30 characters long";
  }
  if (messageText)
      return {messageText: messageText};
  else
      return null;
};


router.use(function(req, res, next){
  if(req.session.user_message) {
    req.user_message = req.session.user_message;
    req.session.user_message = null;
  } else {
    req.user_message = null;
  }
  next();
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'Nightlife App',
    user: getUser(req),
    message: req.user_message
  });
});

router.get('/cities', function(req, res, next) {
  var cityName = req.query.city;
  var places = makeAPIRequest(cityName, req, res);
});

router.get('/register', function(req, res, next) {
  res.render('register', {
    message: req.user_message
  });
});

router.post('/register', function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  var accountInfoError = verifyAccountInfo(username, password);
  if(accountInfoError) {
    res.render('register', {
      title: "Sign Up Now!",
      message: {
        type: 'warning',
        text: accountInfoError.messageText
      }
    });
  } else {
    var salt = bcrypt.genSaltSync(10);
    var hash = bcrypt.hashSync(password, salt);
    var user = new User({
      username: username,
      hash: hash
    });
    user.save(function (err) {
      if (err) {
        req.session.user_message = {
          type: "warning",
          text: username + " is already taken."
        };
        res.redirect('/register');
      } else {
        req.session.user = user;
        req.session.user_message = {
          type: "successful",
          text: "Congratulations, you've successfully made a new account"
        };
        res.redirect('/');
      }
    });
  }
});

router.get('/login', function(req, res, next){
  res.render('login', {
    title: "Login to Nightlife App",
    message: req.user_message
  });
});

router.post('/login', function(req, res, next) {
  User.findOne({username: req.body.username}, function(err, user) {
    
    if(err) {
      throw err;
    }
    
    if(!user) {
      res.render('login', {
        message: {
          type: 'warning',
          text: "Wrong username or password"
        }
      });
    } 
        
    else {
      user.verifyPassword(req.body.password, function(err, verified) {
        if(err) {
          console.log("Login error, see: ", err);
        } else {
          if(verified) {
            req.session.user = user;
            res.redirect('/');
          } else {
            req.session.user_message = {
              type: 'warning',
              text: 'Wrong username or password'
            };
            res.redirect('/login');
          }
        }
      });
    }
    
  });
});

router.get('/logout', function(req, res, next) {
  if(req.session.user) {
    req.session.destroy(function(err) {
      if(err) {
        console.log("Can't logout, see error: ", err);
      }
      res.redirect('/');
    });
  } else {
    res.redirect('/login');
  }
});



module.exports = router;
