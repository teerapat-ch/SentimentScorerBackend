/**
 * Created by Teerapat on 13/6/2560.
 */

/**
 * Created by Teerapat on 13/6/2560.
 */

// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var scoreSchema = new Schema({
    score:Number,

    ip:String,
    comment:{ type: Schema.Types.ObjectId, ref: 'Comment' }
});

// the schema is useless so far
// we need to create a model using it
var Score = mongoose.model('Score', scoreSchema);

// make this available to our users in our Node applications
module.exports = Score;