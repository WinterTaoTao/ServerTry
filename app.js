var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var lessMiddleware = require('less-middleware');

var index = require('./routes/index');
var users = require('./routes/users');

var fs = require('fs');

var formidable = require('formidable');
var cors = require('cors');
var mkdirs = require('jm-mkdirs')

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(lessMiddleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);

app.post('/fileupload', cors(), function (req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    console.log(files.filetoupload.path)
    extract_keyframes(files.filetoupload.path, res);
  })
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;


//extract keyframes
function extract_keyframes(video_path, res){
  var output_path = 'assets/output' + video_path + '/';
  var ffmpeg = require('ffmpeg');

  if(!fs.existsSync(output_path)){
    mkdirs.sync(output_path);
  }

  var process = new ffmpeg(video_path);
  process.then(function (video) {
    // set ffmpeg options
    video.addCommand('-q:v', '2');
    video.addCommand('-vf', 'select="eq(pict_type\\,PICT_TYPE_I)"');
    video.addCommand('-vsync', '0');
    // save keframes
    video.save(output_path + 'frame%d.jpg', function (error, files) {
      if (!error) {
        frames = findSync(output_path);
        var imgContent = [];
        var stepSize = 1;
        if (frames.length > 20) {
          stepSize = Math.floor(frames.length / 10);
        }
        for (var index = 0; imgContent.length < 10 && index < frames.length; index+=stepSize) {
          imgContent.push(fs.readFileSync(frames[index], 'binary'));
        }
        for (var i = 0; i < frames.length; i++) {
          fs.unlinkSync(frames[i])
        }
        fs.rmdirSync(output_path)
        res.send({keyframes: imgContent});
      }
      res.end('finish')
    });

  }, function (err) {
    console.log('Error: ' + err);
  });
}

function findSync(startPath) {
  var result = [];
  function finder (st_path) {
    var files = fs.readdirSync(st_path);
    for (var i = 0; i < files.length; i++) {
      var fpath = path.join(startPath, files[i]);
      result.push(fpath)
    }
  }
  finder(startPath);
  return result;
}
