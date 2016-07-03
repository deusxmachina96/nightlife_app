var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PlaceSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    yelp_id: {
        type: String,
        required: true
    },
    people: {
        type: Number,
        default: 0,
        min: 0
    }
});


PlaceSchema.pre('save', true, function(next, done) {
    var self = this;
    mongoose.models["Place"].findOne({yelp_id: self.yelp_id}, function(err, results) {
        if(err) {
            done(err);
        } else if(results) {
            self.invalidate("yelp_id", "yelp_id must be unique");
            done({
                exists: true
            });
        } else {
            done();
        }
    });
    next();
});

module.exports = mongoose.model('Place', PlaceSchema);