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
// require date file 
const date = require(__dirname + "/data/date.js");


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
const homeStartingContent = "This is a simple blogging web application. Click on the 'PUBLISH' to create a new post with a title and a body. After you're done composing, Submit the post and you'll be redirected to the home page where a part of it will be displayed. Click on the 'Read More' link beside each post you create, and you'll navigate to the respective post's page with the full post body text shown. While there, click on 'Delete Post' to delete the post and you'll navigate to the home page after the respective post is deleted. You could also click on'Edit post' to make changes to the post and you will be redirected to the same page. ";
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
  date: String
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
   res.render("homepage");
});

// homepage route
app.get("/homepage", (req, res) => {
  res.render("homepage");
});

app.get("/home", (req,res)=> {
  Post.find({}, (err, posts) => {
    res.render("home", {
      StartingContent: homeStartingContent,
      posts: posts,
    });
  });
})
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
    const time =date.getTime()
    const post = new Post({
      title: req.body.newPost,
      content: req.body.textArea,
      date: time
    });

    post.save((err) => {
      if (!err) {
        res.redirect("/home");
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
        res.redirect("/home");
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
          res.redirect("/home");
        });
      }
    }
  );
});

// Authenticates users to login
app.post("/login",
  passport.authenticate("local", {
    successRedirect: "/home",
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
  successRedirect: "/home",
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
  successRedirect: "/home",
  failureRedirect: "/login"
}));


// Logout route 
app.post("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/home");
  });
});


app.listen(3000, () => {
  console.log("Server started on port 3000");
});
