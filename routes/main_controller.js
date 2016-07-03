var express = require('express');
var request = require('request');
var bcrypt = require('bcryptjs');
var async = require('async');
var User = require('../models/user_model');
var Place = require('../models/place_model');
var router = express.Router();

/* Makes an API request to Yelp for all bars in target city
 * Called in route /cities?city=...
 */
var makeAPIRequest = function(cityName, req, res) {

  /* Authentication data */
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
      //City is not found, display a generic error
      if(!response.businesses) {
        res.render('cities', {
          error: "City not found",
          user: getUser(req)
        });
      }

      /* Not my proudest function.
       * Calls async.each on an array of places gotten from API call.
       * async.each calls the function passed as second parameter on each
       * element of the array which is passed as first param.
       * More importantly, it calls the function passed as 3rd param only
       * after all the asynchronous functions have finished, which enabled me to
       * send response.businesses array only after it was fully processed.
       */
      else {
        async.each(response.businesses, function(user, place, cb) {

          Place.findOne({yelp_id: place.id}, function(err, found_place){

            if(err) {
              console.log(err);
              return cb(err);
            }

            place.reference = "/login?ref=" + encodeURIComponent(cityName);

            if(found_place) {

              place.people = found_place.people;
              if(user) {
                place.user_going = (user.going_to.indexOf(place.id) !== -1);
              }
              cb(null);

            } else {

              var newPlace = new Place({
                name: place.name,
                yelp_id: place.id,
                people: 0
              });

              newPlace.save(function(error){

                if(error) {
                  return cb(error);
                }

                place.people = 0;
                if(user) {
                  place.user_going = (user.going_to.indexOf(place.id) !== -1);
                }
                cb(null);

              });

            }

          });

        }.bind(null, getUser(req)), function(err) {

          if(err) {

            console.log("One of the iterations produced an error: ", err);

          } else {
            /* All places were successfully processed, send them to 'cities' view */
            res.render('cities', {
              places: response.businesses,
              user: getUser(req)
            });
          }
        });
      }
    }
  });
};

var getUser = function(req) {
  return req.session.user;
};

/* Basic verification without sending to database
 * Returns null if both username and password satisfy requirements.
 */
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

/* I used req.session to pass messages for user such as warnings
 * and errors. I use this middleware function to transfer message from
 * req.session into a local req variable which only persists through one call,
 * so as not to pollute the req.session
 */
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
    title: "Sign Up Now!",
    message: req.user_message
  });
});

/* Creates a new user and stores him in the database.
 * Creation is done directly instead of through model
 * I do break MVC schema here - as well as later.
 * This is an error on my part, I did not plan around
 * MVC I just put in things as I figured out how to do them.
 * Hopefully this won't happen again as I now have more experience
 */
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
    message: req.user_message,
    reference: req.query.ref ? req.query.ref : "/"
  });

});

router.post('/login', function(req, res, next) {

  User.findOne({username: req.body.username}, function(err, user) {
    
    if(err) {
      throw err;
    }
    
    if(!user) {
      req.session.user_message = {
        type: 'warning',
        text: 'Wrong username or password'
      };
      res.redirect('/login?ref=' + req.body.reference);
    } 
        
    else {

      user.verifyPassword(req.body.password, function(err, verified) {

        if(err) {
          console.log("Login error, see: ", err);
        } else {

          if(verified) {
            req.session.user = user;
            if(req.body.reference == '/')
                res.redirect('/');
            else
              res.redirect("/cities?city=" + req.body.reference);
          } else {
            req.session.user_message = {
              type: 'warning',
              text: 'Wrong username or password'
            };
            res.redirect('/login?ref=' + req.body.reference);
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

/* Endpoint for jQuery AJAX call for adding the place to the user's
 * list of locations. It uses variable amount (-1 or 1) to signal whether
 * the place should be added or removed from the user's list.
 * UPDATE: It seems that this is a (minor I guess?) security flaw. I don't send
 * user's password via this POST, so people could add unauthenticated users to some places.
 */
router.post('/add-place', function(req, res, next) {

  var username = req.body.username;
  var place_id = req.body.place_id;
  var amount = req.body.amount;

  User.findOne({username: username}, function(err, user) {

    if(err) {
      console.log("Error finding user: ", err);
      res.statusCode = 500;
      res.send({error: "Internal database error"});
    }

    if(!user) {
      res.statusCode = 403;
      res.send({error: "Unauthorized access"});
    }

    else {
      Place.findOne({yelp_id: place_id}, function(error, place) {
        if (error) {
          console.log("Error finding place: ", err);
          res.statusCode = 500;
          res.send({error: "Internal database error"});
        }

        if (!place) {
          res.statusCode = 404;
          res.send("Wrong place_id");
        }

        else {
          
          if(amount == 1) {

            add_place(user, place, res);

          } else if (amount == -1 && place.people >= 1) {

            remove_place(user, place, res);

          } else {
            /* Trying to remove a user from the place that he isn't even going to */
            res.statusCode = 406;
            res.send({error: user.username + " is already not going to " + place.name});

          }
        }
      });
    }
  });
});

var add_place = function(user, place, res) {

  if(user.going_to.indexOf(place.yelp_id) == -1) {

    User.update({username: user.username}, {$push: {going_to: {$each: [place.yelp_id]}}}, {upsert: true}, function (err) {
      if (err) {

        console.log("Error updating user: ", err);
        res.statusCode = 500;
        res.send({error: "Internal database error"});

      } else {

        Place.update({yelp_id: place.yelp_id}, {$inc: {people: 1}}, function (error) {

          if (error) {

            console.log("Error updating place: ", error);
            res.statusCode = 500;
            res.send({error: "Internal database error"});

          } else {

            res.statusCode = 200;
            res.send({people_going: place.people + 1});

          }
        });
      }
    });

  } else {
    res.statusCode = 406;
    res.send({error: user.username + " is already going to " + place.name});
  }

};

var remove_place = function(user, place, res) {

  User.update({username: user.username}, {$pullAll: {going_to: [place.yelp_id]}}, {upsert: true}, function (err) {

    if (err) {

      console.log("Error updating user: ", err);
      res.statusCode = 500;
      res.send({error: "Internal database error"});

    } else {

      Place.update({yelp_id: place.yelp_id}, {$inc: {people: -1}}, function (error) {

        if (error) {

          console.log("Error updating place: ", error);
          res.statusCode = 500;
          res.send({error: "Internal database error"});

        } else {

          res.statusCode = 200;
          res.send({people_going: place.people - 1});

        }
      });
    }
  });
};


module.exports = router;
