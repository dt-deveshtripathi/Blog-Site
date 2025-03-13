const express = require("express");
const ejs = require("ejs");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt"); // Import bcrypt

const app = express();
const port = 3000;
app.set("view engine", "ejs");
app.use(bodyparser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));

// Session setup
app.use(session({
  secret: 'ANISH', // Replace with a real secret key
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb+srv://username:password@cluster0.pwcrxk3.mongodb.net/oneforall' }) // Replace with your MongoDB URL
}));

// Define schemas and models
const usersSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: { type: String },
});
const postsSchema = new mongoose.Schema({
  title: { type: String },
  titleImage: { type: String }, // Added titleImage field
  paragraph1: { type: String }, // Added first paragraph
  paragraph2: { type: String }, // Added second paragraph
  date: { type: Date, default: Date.now } // Added date field
});



mongoose.connect("mongodb+srv://username:password@cluster0.pwcrxk3.mongodb.net/oneforall");

const users = mongoose.model("users", usersSchema);
const posts = mongoose.model("posts", postsSchema);

app.get("/", function (req, res) {
  res.render("landing", { error: req.session.error || "" });
  req.session.error = null; // Clear error after showing it
});

app.post("/login", async function (req, res) {
  const { email, password } = req.body;
  
  try {
    const user = await users.findOne({ email: email });
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.user = { email: user.email }; // Correctly set session data
      res.redirect("/main");
    } else {
      req.session.error = "Email or Password Incorrect";
      res.redirect("/");
    }
  } catch (error) {
    req.session.error = "Internal server error";
    res.redirect("/");
  }
});

app.post("/register", async function (req, res) {
  const { email, password } = req.body;
  
  try {
    const existingUser = await users.findOne({ email: email });
    if (existingUser) {
      req.session.error = "Already registered";
      res.redirect("/");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new users({ email: email, password: hashedPassword });
      await newUser.save();
      req.session.error = "Registered successfully";
      res.redirect("/");
    }
  } catch (error) {
    req.session.error = "Internal server error";
    res.redirect("/");
  }
});

app.get("/forgot", function (req, res) {
  res.render("forgot", { error: req.session.error || "" });
  req.session.error = null;
});

app.post("/updatepass", async function (req, res) {
  const { email, password } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await users.updateOne({ email: email }, { $set: { password: hashedPassword } });
    
    if (result.matchedCount === 0) {
      req.session.error = "Email not found in database";
    } else if (result.modifiedCount === 0) {
      req.session.error = "No changes were made";
    } else {
      req.session.error = "Password updated successfully";
    }
    res.redirect("/");
  } catch (error) {
    req.session.error = "Internal server error";
    res.redirect("/");
  }
});

app.get('/main', async function (req, res) {
  const mainShow = await posts.find({}).limit(6);
  res.render('main', { 
    mainShow: mainShow, 
    session: req.session // Pass session to the view
  });
});






app.get("/blogs", async function (req, res) {
  const allposts = await posts.find({});
  res.render("blogs", { 
    allposts: allposts, 
    session: req.session // Pass session to the view
  });
});




app.get("/contact", function (req, res) {
  res.render("contact", { session: req.session });
});

app.get("/about", function (req, res) {
  res.render("about", { session: req.session });
});



app.get("/posts/:title", async function (req, res) {
  try {
    const post = await posts.findOne({ title: req.params.title });
    if (post) {
      res.render("post", { 
        title: post.title, 
        titleImage: post.titleImage,
        paragraph1: post.paragraph1,
        paragraph2: post.paragraph2,
        date: post.date,
        session: req.session // Pass session to the view
      });
    } else {
      res.render("post", { 
        title: "Not Found", 
        content: "Post not found.",
        date: null,
        session: req.session // Pass session to the view
      });
    }
  } catch (error) {
    res.render("post", { 
      title: "Error", 
      content: "An error occurred.",
      date: null,
      session: req.session // Pass session to the view
    });
  }
});






// Show compose form
app.get('/compose', function (req, res) {
  if (req.session.user && req.session.user.email === 'test@test.com') {
    res.render('compose', { session: req.session });
  } else {
    res.redirect('/');
  }
});


// Handle blog submission
app.post("/submit-blog", async function (req, res) {
  const { title, titleImage, paragraph1, paragraph2 } = req.body;

  if (req.session && req.session.user) {
    try {
      const newPost = new posts({ 
        title, 
        titleImage, 
        paragraph1, 
        paragraph2 
      });
      await newPost.save();
      res.redirect("/main"); // Redirect to main page after saving the blog
    } catch (error) {
      console.error("Error saving blog:", error);
      res.redirect("/compose"); // Redirect back to compose page on error
    }
  } else {
    res.redirect("/"); // Redirect to home if the user is not authenticated
  }
});



// Logout route
app.get("/logout", function (req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.log("Error while destroying session:", err);
      res.redirect("/main"); // Redirect to the main page if there's an error
    } else {
      res.redirect("/"); // Redirect to the landing page after successful logout
    }
  });
});


app.listen(port, function () {
  console.log(`Server Started at port ${port}.`);
});




