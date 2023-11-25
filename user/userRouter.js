import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Book from "../book/bookModel.js"
import Theuser,{Transaction} from "./userModel.js";
import uploadwithaws from "./sthree.js";
const router = express.Router();



const vretify_jwt = (req, res, next) => {
    // const token = req.cookies["booky-token"];
    const token = req.headers['authorization'];
    if (!token) {
      return res.status(403).json({ msg: "Sign in first" });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      req.email = decoded.email;
      next();
    } catch (err) {
      return res.status(403).json({ msg: "Invalid token" });
    }
  };
/////////////////////////////////// Register ///////////////////////////////
router.post("/register", uploadwithaws("user").fields([{ name: "image", maxCount: 1 }]), async (req, res) => {
  try {
    const { name, password, email, phone, address, role } = req.body;
    const imagePath = req.files && req.files.image[0].key ? req.files.image[0].key : "";
    const egyptMobileRegex = /^(010|011|012|015)[0-9]{8}$/;
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i;
    if (!name.trim() || !password.trim() || !emailRegex.test(email) || !egyptMobileRegex.test(phone) || !address.trim()) {
      return res.status(400).json({ msg: "All fields are required" });
    }
    const hashedpassword = await bcrypt.hash(password, 12);
    const newUser = new Theuser({
      name: name,
      password: hashedpassword,
      email: email,
      phone: phone,
      address: address,
      image: imagePath,
      role: role || "customer",
      used_vouchers: [],
      owned_vouchers: [],
      revenue: 0,
      booksid: [],
    });
    await newUser.save();

    res.status(201).json({ msg: "User added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while adding the user" });
  }
});
  ////////////////////////////////////////////// Login //////////////////////////////////////////
  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await Theuser.findOne({ email: email });
      if (!user) {
        return res.status(403).json({ msg: "Wrong Email" });
      }
      bcrypt
        .compare(password, user.password)
        .then((isMatch) => {
          if (isMatch) {
            const token = jwt.sign(
              { email: user.email },
              process.env.SECRET_KEY,
              {
                expiresIn: "30d",
              }
            );
            res
              .status(201)
              .cookie("booky-token", token, {
                secure: true,
                httpOnly: true,
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
              })
              .json({ role: user.role, token: token });
          } else {
            return res.status(403).json({ msg: "Wrong password" });
          }
        })
        .catch((err) => {
          console.error("Error comparing passwords:", err);
          return res.status(500).json({ msg: "Internal Server Error" });
        });
    } catch (err) {
      console.error("Error in login:", err);
      return res.status(500).json({ msg: "Internal Server Error" });
    }
  });
  
  router.get("/checkemail", async (req, res) => {
    const email = req.query.email;
    if (await Theuser.findOne({ email: email })) {
      res.status(200).json({ msg: "email is registered" });
    } else {
      res.status(204).json({ msg: "email is not registered." });
    }
  });
  

  ///////////////////////////////////// Logout //////////////////////////////////
  router.get("/logout", vretify_jwt, async (req, res) => {
    res.status(200).clearCookie("booky-token").json({ msg: "token deleted" });
  });
  ////////////////////////// Seller Books ////////////////////////////////
  router.get("/userbooks", vretify_jwt, async (req, res) => {
    const email = req.email;
    try {
      const user = await Theuser.findOne({ email: email });
      if (user) {
        const books = user.booksid;
        const booksdata = await Book.find({ _id: { $in: books } }).select('image title price sale year author description ownername');
        res.status(200).json({ books, booksdata });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
    ////////////////////////// Customer Books ////////////////////////////////
    router.get("/customerbooks", vretify_jwt, async (req, res) => {
      const email = req.email;
      try {
        const user = await Theuser.findOne({ email: email });
        if (user) {
          const books = user.bought_books;
          const booksdata = await Book.find({ _id: { $in: books } }).select('image title price sale year author description ownername');
          res.status(200).json({ booksdata });
        } else {
          res.status(404).json({ message: "User not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    });
  
  //////////////////////////////////////// Get User Data //////////////////////////////////////////
  router.get("/userdata", vretify_jwt, async (req, res) => {
    try {
      const email = req.email;
      const user = await Theuser.findOne({ email: email });
  
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
  
      const { _id, name, booksid } = user;
  
      res.status(200).json({ id: _id, name, booksid });
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  //////////////////////// Get Sellers //////////////////////////
  router.get('/sellers', async (req, res) => {
    let page = Number(req.query.page);
    page = page - 1;
    try {
      const sellers = await Theuser.find({ role: 'seller' })
        .skip(page * 12)
        .limit(12);
      const userno = await Theuser.find({ role: 'seller' }).count();
      const usersno = Math.ceil(userno / 12);
      res.json({ sellers, usersno });
    } catch (error) {
      res.status(500).json({ error: "An error occurred while fetching data." });
    }
  });

  ////////////////////////////// Get Searched Seller //////////////////////////
  router.get('/searchseller', async (req, res) => {
    let page = Number(req.query.page);
    const seller = req.query.seller;
    page = page - 1;
  
    try {
      const sellers = await Theuser.find({ name: { $regex: new RegExp(seller, 'i') } })
      .select('id name email image')
      .skip(page * 12)
      .limit(12);
      
      const sellerno = await Theuser.find({ name: { $regex: new RegExp(seller, 'i') } }).count();
      const sellersno = Math.ceil(sellerno / 12);
  
      res.json({ sellers, sellersno });
    } catch (error) {
      res.status(500).json({ error: "An error occurred while fetching data." });
    }
  });

  ////////////////////////////////////// Get Seller Info //////////////////////////////////
  router.get('/getsellerinfo', async (req, res) => {
    const seller_id = req.query.seller_id;
    let page = Number(req.query.page);
    page = page - 1;
    try {
      const seller_info = await Theuser.findOne({ _id: seller_id })
      .select('id name email image phone address createdAt')
      const seller_books = await Book.find({ownerid: seller_id}).skip(page * 12)
      .limit(12)
      .select('image year price description sale bookpdf title author ownername')
      const bookno = await Book.find({ownerid: seller_id}).count();
      const booksno = Math.ceil(bookno / 12);
      res.json({ seller_info, seller_books,booksno });
    } catch (error) {
      res.status(500).json({ error: "An error occurred while fetching data." });
    }
  });
  /////////////////////////////////// get name and image //////////////////////////////////////////
  router.get('/nameandimage',vretify_jwt, async (req, res)=> {
    try{
      const email =req.email;
      const user = await Theuser.findOne({ email: email }).select('name image');
      res.status(200).json(user);
    }
    catch{
      res.status(500).json({msg:"Login required"});
    }
  });
  /////////////////////////////////// User Statics ///////////////////////////////////////////////
  router.get('/userstatics', vretify_jwt, async (req, res) => {
    const email = req.email;
    const user = await Theuser.findOne({ email: email });
  
    if (user.role === "seller") {
      try {
        const user_books = await Book.find({ ownerid: user.id }).select('image id title author year buy_times price sale');
        const user_transactions = await Transaction.find({owner_id : user.id});
        const sold_books_details = await Promise.all(
          user_transactions.map(async (transaction) => {
            const book_id = transaction.bookId;
            const book = await Book.findById(book_id);
            const book_name = book ? book.title : "Unknown";
            const book_amount = (await Transaction.find({ bookId: book_id })).reduce((acc, t) => acc + t.amount, 0);
            return { name: book_name, amount: book_amount, times_sold: book ? book.buy_times : 0 };
          })
        );
        const total_revenue = user_transactions.reduce((acc, transaction) => acc + transaction.amount, 0);
        const top_sold = user_books.sort((a, b) => b.buy_times - a.buy_times).slice(0, 5);
        let total_sells = await Transaction.find({owner_id : user.id}).count();
        const offered_books = user_books.length;

        const monthlySales = user_transactions.reduce((result, transaction) => {
          const year = transaction.year;
          const month = transaction.month;
  
          if (!result[year]) {
            result[year] = {};
          }
  
          if (!result[year][month]) {
            result[year][month] = 0;
          }
  
          result[year][month] += transaction.amount;
  
          return result;
        }, {});
        const currentmonth_sells = monthlySales[new Date().getFullYear()] ?
         monthlySales[new Date().getFullYear()][new Date().toLocaleString('en-US', { month: 'long' })]: 0;
        res.status(200).json({ total_revenue, top_sold, offered_books,monthlySales,total_sells,currentmonth_sells,
          sold_books_details });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    } else {
      res.status(403).json({ msg: "You are not allowed to get this data" });
    }
  });
  ////////////////////////////// User Transactions //////////////////////////
  router.get('/usertransactions', vretify_jwt, async (req, res) => {
    let page = Number(req.query.page);
    page = page - 1;
    const email = req.email;
  
    try {
      const user = await Theuser.findOne({ email: email });
  
      if (user.role === "seller") {
        const transactions = await Transaction.find({ owner_id: user.id }).skip(page * 12)
        .limit(12).select("amount buyer_name month year bookId");
        const transactionno = await Book.find().count();
        const transactionsno = Math.ceil(transactionno / 12);
        const user_transactions = await Promise.all(transactions.map(async (transaction) => {
          const book = await Book.findById(transaction.bookId);
          transaction.bookId = book ? book.title : "Unknown";
          return transaction;
        }));
  
        res.status(200).json({ user_transactions,transactionsno });
      } else {
        res.status(403).json({ msg: "You are not allowed to get this data" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  //////////////////// Check phone ///////////////////////
  router.get('/checkphone', async (req, res) => {
    try {
      const phone = req.query.phone;  
      const user = await Theuser.findOne({ phone: phone }); 
  
      if (user) {
        res.status(200).json({ msg: "This phone is already registered" });
      } else {
        res.status(204).json({ msg: "This phone is available" });
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
 /////////////////////////// get Sellers ////////////////////////
 router.get('/sellers', async (req, res) => {
  const sellers = await Theuser.find({role: "seller"}).select('image name email address phone');
  res.status(200).json(sellers);
 }); 
  
  

  export { router, vretify_jwt };