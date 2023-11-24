import mongoose from "mongoose";
const currentYear = new Date().getFullYear();
const BookSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: [true, "please enter a valid title"],
      minlength: [4, "title can not be less than 4 chars"],
      maxlength: [150, "title can not exceed 150 characters"],
    },
    year: {
        type: Number,
        required: [true, "Please enter a valid year"],
        min: [1000, "Year must be a 4-digit number"],
        max: [currentYear, `Year must not be more than ${currentYear}`],
      },
      price:{
        type:Number,
        required:[true, "please enter a valid price"],
      },
    description: {
      type: String,
    },
    author: {
      type: String,
    }, vouchers: [
      {
        code: {
          type: String,
          required: false,
        },
        discount: { 
          type: Number,
          required: false,
        }
  }],
      sale:{
        type:Number,
        min: [0, "sale must be percentage from 0 to 100"],
        max: [100, "sale must be percentage from 0 to 100"],
        default:0
      },
      bookpdf:{
        type:String,
        required:[true, "Please enter a valid book"]
    },
      buyers:{
            type:[String],
      },
      buy_times:{
        type:Number,
      },
      ownerid:{
        type:String,
      },
      ownername:{
        type:String,
      }
  },
  { timestamps: true }
);

const Book = mongoose.model("books", BookSchema);

export default Book;
