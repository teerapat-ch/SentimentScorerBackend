/**
 * Created by Teerapat on 13/6/2560.
 */


const express = require('express');
const app = express();
var getIP = require('ipware')().get_ip;
const Comment = require('./models/comment');
const Score = require('./models/score');

const Filehound = require('filehound');
var fs = require('fs');
var jsonfile = require('jsonfile');

var bodyParser = require('body-parser');
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

const maxScorer = 3;

const MONGO_URI = 'mongodb://localhost/SENTIMENT_SCORER';



const maxScoredAmt = 3;



app.get('/', function(req, res) {
    res.sendFile(__dirname + '/welcome.html');
});

app.get('/main', function(req, res) {
    res.sendFile(__dirname + '/main.html');
});

app.get('/comments', function(req, res) {

    //Create new test comment
    // const newComment = new Comment({
    //
    //     service:'dtac',
    //     from:{
    //         id:'212312213123',
    //         name:"Sw'r Charlotte"
    //     },
    //     like_count: 0,
    //     message: 'ครบสัญญาก็จะเปลี่ยนค่ายล่ะค่ะ สัญญาณนี่แทบจะหาไม่เจอ ไม่โอเค ค่าบริการนี่เรียกเก็บจริง แต่สัญญาณนี่จัดว่า #เเย่ๆๆๆๆๆๆๆๆๆๆๆๆๆๆๆๆๆ", "id": "10155983199367069_10155989930747069", "user_likes": false}, {"from": {"name": "Nattachai Chujit", "id": "817375651657688"}, "like_count": 4, "can_remove": false, "created_time": "2017-06-11T07:51:32+0000", "message": "ลื่นชิบหายเลยทีเดียว​ เน็ตโครตกาก​ แต่โฆษณาเกินจริง​ เอาเปรียบผู้บริโภค​เกินไป​เปล่า​ ห่วยชิบหาย​ ขอหยาบหน่อยเหอะ​", "id": "10155983199367069_10155989727427069", "user_likes": false}, {"from": {"name": "ศิโรรัตน์ นู๋มิลล์ เกลี้ยงคำหมอ", "id": "140843406290829"}, "like_count": 0, "can_remove": false, "created_time": "2017-06-12T11:41:31+0000", "message": "แต่ละเดือนนี้มียอดเกินมา 100 กว่าบาท คือค่าอะไร  ตอนสมัครก็บอกว่าจ่ายเดือนละ 545 บาท + ภาษีแล้ว ประมาณ  580  แล้วเราจำกัดการใช้งานไว้ที่ 550\n คืองงใจมาก บิลแต่ละเดือนนี้เกินมา ร้อยกว่าทุกเดือน\nเนตอ่ะดี ขอบ แต่ส่วนเกินเยอะจัง ถ้าจะโกงกันแบบนี้\nก็ย้ายค่ายเถอะ  ถ้าไม่ไปจ่ายเองจะไม่รู้เลยว่ามีส่วนเกินเยอะขนาดนี้',
    //
    //     commented_at: new Date()
    // });
    //
    // newComment.save();
    var ipInfo = getIP(req);
    console.log(ipInfo);


    Comment.find({},function(err,comment){
        if(err) return res.status(500).send(err);
        return res.send(comment);
    })
});


app.get('/getRandomComments/:number',function(req,res){
    var ipInfo = getIP(req);
    const {clientIp,clienIpRoutable} = ipInfo;
    const number = parseInt(req.params.number);
    console.log(number);
    var last2Mins = new Date();
    last2Mins.setMinutes(last2Mins.getMinutes()-2);

    Comment.find({message:{$ne:''},scoredAmt:{$lte:maxScoredAmt},loaded_time:{$not:{$gte:last2Mins}},"scores.ip":{$not:{$in:[clientIp]}}},function(err,comments){
        if(err) return res.status(500).send(err);
        if(comments.length==0) return res.send("alldone");

        //All the comments are candidates. Randomly select one
        const randIndex = Math.floor(Math.random()*parseInt(comments.length/number));

        const randomComments = comments.slice(randIndex,randIndex+number);

        //Set loaded = true
        randomComments.forEach(function(comment){
            comment.loaded_time = new Date();
            comment.save();
        });

        return res.send(randomComments);


    })




});

app.get('/howmanyleft',function(req,res){
    var ipInfo = getIP(req);
    const {clientIp,clienIpRoutable} = ipInfo;
    Comment.find({"scores.ip":{$not:{$in:[clientIp]}}}).count(function(err,c){
        if(err) return res.status(500).send(err)
        return res.json({count:c});
    });
});

app.get('/getNextComment',function(req,res){
    var ipInfo = getIP(req);
    const {clientIp,clienIpRoutable} = ipInfo;
    console.log(clientIp);

    var last5Mins = new Date();
    last5Mins.setMinutes(last5Mins.getMinutes()-5);

    Comment
        .find({})
        .sort('scoredAmt')  // give me the max
        .exec(function (err, comments) {
            const minScoredAmt = comments[0].scoredAmt;
            console.log(minScoredAmt);
            Comment.find({message:{$ne:''},scoredAmt:minScoredAmt,loaded_time:{$not:{$gte:last5Mins}},"scores.ip":{$not:{$in:[clientIp]}}},function(err,comments){
                if(err) return res.status(500).send(err);
                if(comments.length==0) return res.send("All done!! Well done!");

                //All the comments are candidates. Randomly select one
                const comment = comments[Math.floor(Math.random()*comments.length)];

                //Set loaded = true
                comment.loaded_time = new Date();

                //Return the comment to user.

                comment.save(function(err){
                    if(err) return res.status(500).send(err);
                    return res.send(comment)
                });

            })

        });



});

//POST request
app.post('/sendScore',function(req,res){
    console.log(req.body);
    const {score,comment_id} = req.body;
    var ipInfo = getIP(req);



    Comment.findById(comment_id,function(err,comment){
        const newScore = new Score({score:score,ip:ipInfo.clientIp,comment:comment._id});
        if(comment.scoredAmt>=maxScorer){return res.status(500).send("Scorer is already full.")}
        comment.scoredAmt += 1;
        newScore.save();
        const curScores = comment.scores;
        curScores.push(newScore);
        comment.scores = curScores;
        comment.save(function(err) {
            if (err) return res.status(500).send(err);
            return res.send("success");
        });
    })

});



function action(file) {
    //Extract comments from file and add those into the mongoDB
    jsonfile.readFile(file, function(err, obj) {
        if(err) console.log("ERROR");

        const comments = obj.data;


        //Insert to Database

        comments.map(function(obj) {
            obj.service = 'dtac';
            return obj;
        });

        Comment.create(comments, function(err,newComments){
            // Move the imported file to imported_datasets
            if(!err) {
                console.log("FInish reading " + file);
                fs.rename(file, './dataset/imported_dataset/' + file.split("\\").pop(), function (err) {
                    if (err) throw err;
                });
            }
            else{
                console.log("Error at file : "+file);
            }
        });



    });


}


//importer
app.get('/importFiles2DB',function(req,res){
    const dataset_dir = './dataset/unimported_dataset';

    Filehound.create()
        .path(dataset_dir)
        .ext('txt')
        .find((err, files) => {
            if (err) {
                return console.error(`error: ${err}`);
            }

            files.forEach(action);

            return res.send("Success. The system is currently importing the file to mongo");
        });

})


app.get('/pic/:picImg', function(req, res) {
    const picName = __dirname+"/pic/"+req.params.picImg;
    res.sendFile(picName);
});


require('mongoose').connect(MONGO_URI, function(err){
    if(err) throw err;
    console.log(`MongoDB connected to ${MONGO_URI}`);

    app.listen(3000, function() {
        console.log('listening on 3000')
    });
});