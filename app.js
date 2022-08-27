//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const { stubString } = require("lodash");

const homeStartingContent =
  "rhthgft platea dictumst vestibulum rhoncus est pellentesque platea dictumst vestibulum rhoncus est pellentesque rhoncus est pellentesque. Dictumst vestibulum rhoncus";
const aboutContent =
  "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent =
  "Scelerisque eleifend donec pretium vulputate rhoncus est pellentesque. Dictumst vestibulum rhoncus  sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";
const app = express();
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// MOONGOOSE!!!!

mongoose.connect("mongodb://localhost:27017/blogDB", { useNewUrlParser: true });

const postSchema = {
  title: String,
  content: String,
};

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

app.get("/compose", (req, res) => {
  res.render("compose");
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
app.post("/compose", (req, res) => {
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

// delete route 

app.post("/delete",  (req, res)=> {
  const deletedPost = req.body.deletedPost;
  Post.deleteOne({ _id: deletedPost },  (err)=> {
    if (!err) {
      res.redirect("/");
    }
  });
});


app.listen(3000,  () =>{
  console.log("Server started on port 3000");
});
