import express from "express";
import multer from "multer";
import path from "path";
import Book from "./bookModel.js";
import Theusers,{Transaction} from "../user/userModel.js";
import { vretify_jwt } from "../user/userRouter.js";

const router = express.Router();
/////////////////////////////// Storage //////////////////////////////
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png" && ext !== ".pdf") {
      return callback(new Error("Only images and PDFs are allowed"));
    }
    const dest = path.extname(file.originalname) === '.pdf' ? './books/' : './images/books/';
    callback(null, dest);
  },
  filename: (req, file, callback) => {
    callback(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".jpg" && ext !== ".jpeg" && ext !== ".png" && ext !== ".pdf") {
      return callback(new Error("Only images and PDFs are allowed"));
    }
    callback(null,  Date.now() + path.extname(file.originalname));
  },
});

//////////////////////////////// ADD Book //////////////////////////////////
router.post(
  "/addbook",
  vretify_jwt,
  upload.fields([{ name: "image", maxCount: 1 }, { name: "bookpdf", maxCount: 1 }]),
  async (req, res) => {
    const { title, price, description, year, author, sale } = req.body;
    const imagePath = req.files["image"] ? req.files["image"][0].path : "";
    const pdfPath = req.files["bookpdf"] ? req.files["bookpdf"][0].path : "";
    const userEmail = req.email;
    const user = await Theusers.findOne({ email: userEmail });

    if (!title || !price) {
      return res.status(400).json({ msg: "All data are required" });
    }
    const yearRegex = /^(19|20)\d{2}$/;
    if(!yearRegex.test(year)) {
      return res.status(400).json({ msg: "Wrong Year" });
    }
    try {

      const book = new Book({
        title: title,
        price: Number(price),
        image: imagePath,
        bookpdf: pdfPath,
        description: description,
        ownerid: user._id,
        ownername: user.name,
        year: year,
        buy_times:0,
        author: author || "",
        sale: Number(sale) || 0,
        vouchers:[],
      });
      
      await book.save();
      
      user.booksid.push(book.id);
      await user.save();
      res.status(201).json({ msg: "Book added successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ msg: error.message });
    }
  }
);

//////////////////////////////// Gett all Book //////////////////////////////////
router.get('/books', async (req, res) => {
  let page = Number(req.query.page);
  page = page - 1;
  try {
    const books = await Book.find()
      .skip(page * 12)
      .limit(12).select('image year price description sale title author ownername _id vouchers.discount');
    const bookno = await Book.find().count();
    const booksno = Math.ceil(bookno / 12);
    res.json({ books, booksno });
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching data." });
  }
});

//////////////////////////////// Get Search Books //////////////////////////////////
router.get('/searchbooks', async (req, res) => {
  let page = Number(req.query.page);
  const bookname = req.query.book;
  page = page - 1;

  try {
    const books = await Book.find({ title: { $regex: new RegExp(bookname, 'i') } })
      .skip(page * 12)
      .limit(12).select('image year price description sale bookpdf title author ownername');

    const bookno = await Book.find({ title: { $regex: new RegExp(bookname, 'i') } }).count();
    const booksno = Math.ceil(bookno / 12);

    res.json({ books, booksno });
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching data." });
  }
});

//////////////////////////////// Get Searched Seller Books //////////////////////////////////
router.get('/searchsellerbooks', async (req, res) => {
  let page = Number(req.query.page);
  const seller = req.query.seller;
  page = page - 1;

  try {
    const books = await Book.find({ ownername: { $regex: new RegExp(seller, 'i') } })
      .skip(page * 12)
      .limit(12).select('image year price description sale bookpdf title author ownername');

    const bookno = await Book.find({ ownername: { $regex: new RegExp(seller, 'i') } }).count();
    const booksno = Math.ceil(bookno / 12);

    res.json({ books, booksno });
  } catch (error) {
    res.status(500).json({ error: "An error occurred while fetching data." });
  }
});
///////////////////////////// Generate voucher ///////////////////////////
function generateVoucherCode() {
 return Math.random().toString(36).substring(2, 10).toUpperCase();
}
router.post('/addvoucher',vretify_jwt, async (req, res) => {
  const email = req.email;
  const user = await Theusers.findOne({ email: email});
  if(user.role !=="seller"){
    res.status(403).json({msg:"You are not allowed to make a voucher"});
  }
  try{
    const {book_id, amount } = req.body;
    if(isNaN(amount)){
      res.status(500).json({ msg: "amount should be a number" });
    }
    const book = await Book.findById(book_id);
    if(book.ownerid === user.id){
      const voucherCode = generateVoucherCode(); 
      const voucherDiscount = amount;
      book.vouchers.push({
        code: voucherCode,
        discount: voucherDiscount,
      });
      await book.save();
      return res.status(200).json({ msg: "Voucher has been added" });
    }
    else{
      res.status(403).json({msg:"You are not allowed to make a voucher"});
    }
  }
  catch(error) {
    res.status(500).json({ error: error.message });
  }
});
//////////////////////////////// Buying //////////////////////////////////
router.post('/buying',vretify_jwt, async (req, res) => {
  try {
  const email = req.email;
  const buyer = await Theusers.findOne({ email: email });
  const book_id = req.body.book;
  const book = await Book.findById(book_id);
  const owner = await Theusers.findById(book.ownerid);
  if (buyer.role !== "customer" || owner.id === buyer.id){
    return res.status(500).json({ error: "The payment can not be done since you are not a customer." });
  }
  if(buyer.bought_books.includes(book_id)){
    return res.status(200).json({ msg: "You already have this book." });
  }
  let discount = 0;
  if (buyer.owned_vouchers.length > 0) {
    for (let voucherCode of buyer.owned_vouchers) {
      const matchingVoucher = owner.used_vouchers.find((ownervoucher) => ownervoucher.code === voucherCode);
      if (matchingVoucher) {
        discount = matchingVoucher.discount;
        owner.used_vouchers.remove(matchingVoucher);
        buyer.owned_vouchers.remove(voucherCode);
        break;
      }
    }
  }
  if(book.vouchers.length > 0){
    const voucher = book.vouchers[0];
    owner.used_vouchers.push(voucher);
    book.vouchers.remove(voucher);
    buyer.owned_vouchers.push(voucher.code);
  }
  const transaction = new Transaction({
    amount: (book.price* (1-(book.sale/100)) * (1-(discount/100))),
    bookId: book_id,
    month: new Date().toLocaleString('en-US', { month: 'long' }),
    year: new Date().getFullYear(),
    buyer_id: buyer.id,
    buyer_name: buyer.name,
    owner_id:owner.id,
  });

  await transaction.save();
  book.buy_times += 1;
  book.buyers.push(buyer.id);
  buyer.bought_books.push(book_id);
  await buyer.save();
  await book.save();
  await owner.save();
  res.status(201).json({ msg: "The order has been done." });
}
catch(error) {
res.status(500).json({ error: error.message });
}
});
//////////////////////////////// Get Customer Bought Books //////////////////////////////////
router.get('/customerbooks',vretify_jwt, async (req, res) => {
const email = req.email;
const customer = await Theusers.findOne({ email: email });
  const bought_books = customer.bought_books;

  ////////////////////////////////
  let customer_voucher_books = [];
  let customer_vouchers = customer.owned_vouchers;
  
  const sellers = await Theusers.find({
    role: "seller",
    "used_vouchers.code": { $in: customer.owned_vouchers }
  }).select('used_vouchers booksid');
  
  sellers.forEach((seller) => {
    customer_vouchers.forEach((voucher) => {
      let thevoucher = seller.used_vouchers.find((seller_voucher) => seller_voucher.code === voucher);
      if (thevoucher) {
        let amount = thevoucher.discount || 0;
        customer_voucher_books.push({ bookId: seller.booksid, amount });
      }
    });
  });
  let structured_vouchers = [];
  customer_voucher_books.forEach((voucher)=>{
    voucher.bookId.forEach((bookId)=>{
      structured_vouchers.push({"bookid":bookId, "discount":voucher.amount});
    })
  })

  ////////////////////////////////
  res.status(200).json({ bought_books,structured_vouchers });
});
///////////////////////////////////////// Show The Files //////////////////////////////////
router.get('/getfile',vretify_jwt,async (req, res) => {
  try{
  const book_id = req.query.book_id;
  const book = await Book.findById(book_id);
  const email = req.email;
  const customer = await Theusers.findOne({ email: email });
  if(book.buyers.includes(customer._id)){
    const bookpdf = book.bookpdf;
    res.status(200).json({ bookpdf });
  } 
  else {
    res.status(403).json({msg:"You are not allowed to see this book"});
  }}
  catch{
    res.status(500).json({msg:"The Server Had An Error"});
  }
});
///////////////////////////////// user books /////////////////////////////////////////////
router.get('/userbooks',vretify_jwt, async (req, res) => {
  let page = Number(req.query.page);
  page = page - 1;
  const email = req.email;
  const user = await Theusers.findOne({ email: email });
  if(user.role === "seller"){
    try{
      const books = await Book.find( {ownerid: user.id}).skip(page * 12)
      .limit(12).select('image year price sale title author buy_times ');
    const bookno = await Book.find().count();
    const booksno = Math.ceil(bookno / 12);
      res.status(200).json({ books,booksno });
    }
    catch(error){
      console.log(error.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
  else{
    res.status(403).json({ msg: "You are not allowed to get this data" });
  }

});

export { router };
