//jshint esversion:6
// Dot ENV : to keep keys and apis secure 
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const { stubString } = require("lodash");
const app = express();
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const FacebookStrategy = require('passport-facebook');

// plugin for Mongoose which adds a findOrCreate method to models
const findOrCreate = require('mongoose-findorcreate')



app.set("view engine", "ejs");

app.engine("ejs", require("ejs").__express);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// use express-session for cookies
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: true,
    saveUninitialized: false,
  })
);

// use passport-local-mongoose
app.use(passport.initialize());
app.use(passport.session());

// Default texts
const homeStartingContent =
  " Vestibulum vestibulum rhoncus est pellentesque platea dictumst vestibulum rhoncus est pellentesque rhoncus est habitasse platea dictumst vestibulum pellentesque. Dictumst vestibulum rhoncus habitasse platea dictumst vestibulum ";
const aboutContent =
  " Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent =
  " pellentesque. Dictumst vestibulum rhoncus. Arcu dui elit  arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

// MOONGOOSE!!!!
mongoose.connect("mongodb://localhost:27017/blogDB", { useNewUrlParser: true });
// post Schema for blog posts
const postSchema = {
  title: String,
  content: String,
};

// Users Schema: for login and authentication

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  post: String

});

// Secures saved data to Mongoose
userSchema.plugin(passportLocalMongoose);
// Google to Mongoose
userSchema.plugin(findOrCreate);


const User = new mongoose.model("User", userSchema);

// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});
passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

// Mongoose Model 
const Post = mongoose.model("Post", postSchema);

// Root Route
app.get("/", (req, res) => {
  Post.find({}, (err, posts) => {
    res.render("home", {
      StartingContent: homeStartingContent,
      posts: posts,
    });
  });
});
// About page Route 
app.get("/about", (req, res) => {
  res.render("about", { aboutPage: aboutContent });
});

// Contact  page Route 
app.get("/contact", (req, res) => {
  res.render("contact", { contactInfo: contactContent });
});

// routing
app.get("/posts/:postId", (req, res) => {
  const requestedPostId = req.params.postId;

  const requestedId = req.params.postId;
  Post.findById(requestedId, (err, post) => {
    res.render("post", {
      title: post.title,
      content: post.content,
      post,
    });
  });
});


// New blog route
app.route("/compose")
  .get((req, res) => {
    // Check if user is authenticated to publish new posts

    if (req.isAuthenticated()) {
      res.render("compose");
    } else {
      res.redirect("/login");
    }
  })
  .post((req, res) => {
    const post = new Post({
      title: req.body.newPost,
      content: req.body.textArea,
    });

    post.save((err) => {
      if (!err) {
        res.redirect("/");
      }
    });
  });


// Delete post route
app.post("/delete", (req, res) => {
  const deletedPost = req.body.deletedPost;
  // Only Authorized users can delete posts

  if (req.isAuthenticated()) {
    Post.deleteOne({ _id: deletedPost }, (err) => {
      if (!err) {
        res.redirect("/");
      }
    });
  } else {
    res.redirect("/login");
  }
});

// update  title/content route
app.post("/update", (req, res) => {
  const updateId = req.body.updatePost;
  const newTitleName = req.body.newTitle;
  const newContent = req.body.newContent;

  // Only Authorized users can edit posts
  if (req.isAuthenticated()) {
    Post.updateOne(
      { updateId },
      { title: newTitleName, content: newContent },
      (err) => {
        if (!err) {
          res.redirect("/posts/" + updateId);
        }
      }
    );
  } else {
    res.redirect("/login");
  }
});

// Login & Authentication
// Register Route 
app.get("/register", (req, res) => {
  res.render("register");
});

// Login Route 
app.get("/login", (req, res) => {
  res.render("login");
});


app.post("/register", (req, res) => {
  User.register(
    { username: req.body.username },
    req.body.password,
    (err, user) => {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/");
        });
      }
    }
  );
});

// Authenticates users to login
app.post("/login",
  passport.authenticate("local", {
    successRedirect: "/compose",
    failureRedirect: "/login",
  })
);


// Use Google to register or login 
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/compose"},
  function(accessToken, refreshToken, profile, cb){
    User.findOrCreate({googleId:profile.id},function (err,user){
      return cb(err, user);
    });
  }
));

// Authenticate Google Signing with PassportJS
app.get("/auth/google",
  passport.authenticate("google", { scope:
      [ "email", "profile" ] }
));

// Rendering page after Signing with Google 
app.get("/auth/google/compose", passport.authenticate('google', {
  successRedirect: "/compose",
  failureRedirect: "/login"
}));

// Use Facebook to register or login 

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/compose"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ facebookId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

// Authenticate Facebook Signing with PassportJS
app.get("/auth/facebook",
passport.authenticate("facebook")
);

// Rendering page after Signing with Facebook 
app.get("/auth/facebook/compose", passport.authenticate('facebook', {
  successRedirect: "/compose",
  failureRedirect: "/login"
}));


// Logout route 
app.post("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});


app.listen(3000, () => {
  console.log("Server started on port 3000");
});
