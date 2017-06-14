/**
 * Created by Teerapat on 13/6/2560.
 */

// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const scoreSchema = require('./comment');
var random = require('mongoose-simple-random');
// create a schema
var commentSchema = new Schema({

    service:String,
    from:{
        id:String,
        name:String
    },
    like_count: Number,
    message: String,

    created_time: Date,
    loaded_time:Date,
    // id:{type:String,unique:true},

    scores:[scoreSchema],
    scoredAmt:{type:Number,default:0}
});

commentSchema.plugin(random);

// the schema is useless so far
// we need to create a model using it
var Comment = mongoose.model('Comment', commentSchema);

// make this available to our users in our Node applications
module.exports = Comment;