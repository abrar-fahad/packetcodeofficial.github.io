const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const app = express();
app.use(express.static(path.join(__dirname, 'views')));

mongoose.connect('mongodb+srv://mydatabase:24149115@cluster0.9qyxxur.mongodb.net/auctionDB?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection.on('error', (error) => {
  console.error('Error connecting to MongoDB:', error);
});

mongoose.connection.once('open', () => {
  console.log('Connected to MongoDB Atlas');
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const productSchema = new mongoose.Schema({
  name: String,
  description: String,
  startingBid: Number,
  currentBid: Number,
  endTime: Date,
  image: {
    data: Buffer,
    contentType: String,
  },
});

const Product = mongoose.model('Product', productSchema);
const userSchema = new mongoose.Schema({
  name: String,
  username: String,
  email: String,
  password: String,
});

const User = mongoose.model('User', userSchema);

app.get('/', (req, res) => {
  res.sendFile('home.html', { root: './views' });
});

app.get('/login', (req, res) => {
  res.sendFile('login.html', { root: './views' });
});

app.get('/signup', (req, res) => {
  res.sendFile('signup.html', { root: './views' });
});

app.get('/contact', (req, res) => {
  res.sendFile('contact.html', { root: './views' });
});
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username: username });
    if (user && user.password === password) {
      // You can add session management or token-based authentication here
      res.redirect('/'); // Redirect to the home page
    } else {
      res.status(401).send('Invalid username or password');
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.sendStatus(500);
  }
});
app.post('/register', async (req, res) => {
  const { name, username, email, password, 'password-verify': passwordVerify } = req.body;
  if (password !== passwordVerify) {
    res.status(400).send('Passwords do not match');
    return;
  }

  try {
    const existingUser = await User.findOne({ username: username });
    if (existingUser) {
      res.status(409).send('Username already exists');
      return;
    }

    const newUser = new User({ name, username, email, password });
    await newUser.save();

    // You can add session management or token-based authentication here
    res.redirect('/'); // Redirect to the home page
  } catch (error) {
    console.error('Error during registration:', error);
    res.sendStatus(500);
  }
});


app.post('/contact/send', async (req, res) => {
  const { name, email, message } = req.body;

  const transporter = nodemailer.createTransport({
    // Set up your email provider's settings
  });

  const mailOptions = {
    from: email,
    to: 'yckwu1@gmail.com',
    subject: 'Contact Form Submission',
    text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`, // plain text body
  };

  try {
    // Send the email
    await transporter.sendMail(mailOptions);
    console.log('Email sent');
    res.redirect('/contact');
  } catch (error) {
    console.error('Error sending email:', error);
    res.redirect('/contact');
  }
});

app.post('/api/products', upload.single('productImage'), async (req, res) => {
  try {
    const product = new Product({
      name: req.body.productName,
      description: req.body.productDescription,
      startingBid: req.body.startingBid,
      currentBid: req.body.startingBid,
      endTime: req.body.auctionEndTime,
      image: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      },
    });

    await product.save();
    res.sendStatus(201);
  } catch (error) {
    console.error('Error saving product:', error);
    res.sendStatus(500);
  }
});
app.post('/api/products/:id/bid', async (req, res) => {
  try {
    const productId = req.params.id;
    const bidAmount = parseFloat(req.body.bidAmount);

    const product = await Product.findById(productId);

    if (bidAmount > product.currentBid) {
      product.currentBid = bidAmount;
      await product.save();
      res.sendStatus(200);
    } else {
      res.status(400).send("Bid amount should be higher than the current bid.");
    }
  } catch (error) {
    console.error('Error placing a bid:', error);
    res.sendStatus(500);
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.sendStatus(500);
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (product) {
      res.json(product);
    } else {
      res.status(404).send('Product not found');
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});