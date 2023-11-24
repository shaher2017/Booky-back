import mongoose from 'mongoose';


const transactionsSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    bookId: {
      type: String,
      required: true,
    },
    month: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    buyer_id:{
      type: String,
      required:true
    },
    buyer_name:{
      type: String,
      required: true,
    },
    owner_id:{
      type: String,
      required: true,
    }
  }
);

const theusersSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: [true, "please enter a valid name"],
      maxlength: 40,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    phone: {
        type: String,
        unique: true,
        required: true,
      },
    address: {
        type: String,
      },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["seller", "customer"],
      required: true,
    },
    bought_books:{
      type:[String],
    },
    owned_vouchers:{
      type:[String],
      required: false,
    },
    booksid: {
      type: [String],
    },
  used_vouchers: [
    {
      code: {
        type: String,
        required: false,
      },
      discount: {
        type: Number,
        required: false,
      }
}]
  },
  { timestamps: true }
);

const Theusers = mongoose.model("BookyUser", theusersSchema);
const Transaction = mongoose.model("BookyTrans", transactionsSchema);
export default Theusers;
export {Transaction};
