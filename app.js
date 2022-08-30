//jshint esversion:6

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

app.set("view engine", "ejs");

app.engine("ejs", require("ejs").__express);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// use express-session for cookies
app.use(
  session({
    secret: "little secret",
    resave: true,
    saveUninitialized: false,
  })
);

// use passport
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
  email: String,
  password: String,
});

// Secures saved data to Mongoose
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

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

app.get("/about", (req, res) => {
  res.render("about", { aboutPage: aboutContent });
});
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

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

// New blog route
app
  .route("/compose")
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
    res.redirect("/posts/" + deletedPost);
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
    res.redirect("/posts/" + updateId);
  }
});

// Login & Authentication
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

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/compose",
    failureRedirect: "/login",
  })
);

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
