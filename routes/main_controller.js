var express = require('express');
var http = require('http');
var router = express.Router();

var makeAPIRequest = function(cityName) {
  console.log(process.env.YELP_API_KEY);
};

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'Nightlife App'
  });
});

router.get('/cities', function(req, res, next) {
  var cityName = req.query.city;
  makeAPIRequest(cityName);
  res.render('cities', {
    places: [
      {
        name: "Millionaire's Club",
        picture: "https://pbs.twimg.com/profile_images/604118658537930752/Eoo5Jk84.png",
        desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec malesuada sem metus," +
        " id efficitur augue scelerisque ut. Aliquam placerat porttitor leo sit amet cursus. Aliquam dictum sem vitae neque imperdiet.",
        numberOfPeople: 7
      },
      {
        name: "John's Pub",
        picture: "https://pbs.twimg.com/profile_images/636974247722643457/9XRVfSZ-.jpg",
        desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec pharetra, odio nec porta viverra, mi ipsum pharetra dolor, ac feugiat.",
        numberOfPeople: 0
      },
      {
        name: "Buddy's Place",
        picture: "http://schneidermaninsurance.com/wp-content/uploads/2014/03/restaurant-icon-1-e1396080178803.png",
        desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt metus quis aliquam interdum. " +
        "Phasellus consectetur diam sapien, euismod lobortis purus eleifend nec. In ut feugiat lorem. Proin condimentum id magna et lacinia. Curabitur lectus.",
        numberOfPeople: 2
      }
    ]
  })
});

module.exports = router;
