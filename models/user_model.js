var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');
var Schema = mongoose.Schema;

var PlaceSchema = new Schema({
    name: {
        type: String,
        required: true
    }
});

var UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 30
    },
    hash: {
        type: String,
        required: true
    },
    going_to: [PlaceSchema]
});

UserSchema.pre('save', true, function(next, done) {
    var self = this;
    mongoose.models["User"].findOne({username: self.username}, function(err, results) {
        if(err) {
            done(err);
        } else if(results) {
            self.invalidate("username", "Username must be unique");
            done(new Error("Username must be unique"));
        } else {
            done();
        }
    });
    next();
});
UserSchema.methods.verifyPassword = function(password, cb) {
    bcrypt.compare(password, this.hash, function(err, isMatch) {
        if(err) {
           return cb(err)
        }
        cb(null, isMatch);
    });
};

module.exports = mongoose.model('User', UserSchema);