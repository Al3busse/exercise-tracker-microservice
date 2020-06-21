const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const moment = require("moment");
const cors = require("cors");

const mongoose = require("mongoose");
mongoose.connect(process.env.ET_DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

// Schema

const userSchema = new mongoose.Schema({
  username: String,

  log: [{ description: String, duration: Number, date: String }]
});

const User = mongoose.model("User", userSchema);

// create user (post) + unique username check

app.post("/api/exercise/new-user", function(req, res) {
  if (req.body.username !== "") {
    User.findOne({ username: req.body.username }, function(err, result) {
      if (err) {
        console.log(err);
      }
      if (result) {
        res.json({
          note: "username in use, pick another username",
          username: result.username,
          _id: result._id
        });
      } else {
        var newUser = new User({ username: req.body.username });
        newUser.save(err => {
          if (err) {
            console.log(err);
          }
          res.json({ username: newUser.username, _id: newUser._id });
        });
      }
    });
  } else res.json("invalid username");
});

// get all users id

app.get("/api/exercise/users", function(req, res) {
  User.find({}, function(err, users) {
    if (err) {
      console.log(err);
    }
    res.json(
      users.map(user => {
        return { username: user.username, id: user._id };
      })
    );
  });
});

//add exercise (post)

app.post("/api/exercise/add", function(req, res) {
  // check date format and if its not empty

  function dateCheck(d) {
    if (d === "" || d === undefined) {
      return (d = new Date());
    } else if (moment(d, "YYYY-MM-DD", true).isValid()) {
      return (d = new Date(d));
    } else {
      return res.json(
        "Invalid date. Please enter a valid date in the format YYYY-MM-DD"
      );
    }
  }
  var date = dateCheck(req.body.date).toDateString();

  User.findById(req.body.userId, function(err, user) {
    if (err) {
      console.log("user.find error: " + err);
      res.json("invalid user id");
    } else {
      user.log = user.log.concat({
        description: req.body.description,
        duration: parseInt(req.body.duration),
        date: date
      });

      user.save(err => {
        if (err) {
          console.log("save error: " + err);
        }
      });
      res.json({
        username: user.username,
        _id: user._id,
        description: req.body.description,
        duration: parseInt(req.body.duration),
        date: date
      });
    }
  });
});

// retrieve exercise log (get)

app.get("/api/exercise/log?:userId", function(req, res) {
  User.findById(req.query.userId, function(err, user) {
    if (err) {
      res.json("invalid user id");
    } else {
      let logs = user.log;
      let from = req.query.from;
      let to = req.query.to;
      let limit = req.query.limit;

      if (from && to) {
        logs = user.log.filter(obj => {
          if (moment(obj.date).isBetween(from, to, undefined, "[]")) {
            return obj;
          }
        });
      } else if (from === undefined && to) {
        logs = user.log.filter(obj => {
          if (moment(obj.date).isSameOrBefore(to)) {
            return obj;
          }
        });
      } else if (from && to === undefined) {
        logs = user.log.filter(obj => {
          if (moment(obj.date).isSameOrAfter(from)) {
            return obj;
          }
        });
      }
      let count = logs.slice(0, limit).length;
      res.json({
        username: user.username,
        _id: user._id,
        count: count,
        log: logs.slice(0, limit)
      });
    }
  });
});
