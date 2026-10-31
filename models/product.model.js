import { Schema } from "mongoose";

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, "too short product title"],
      maxlength: [5, "too long product title"],
    },
    slug: {
      type: String,
      lowercase: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      minlength: [20, "Too short product description"],
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      index: true,
    },
    brand: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
    },
    images: [String],
    ratingAvg: {
      type: Number,
      default: 0,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
  },
  { timeseries: true },
);

const variantSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    index: true,
  },
  sku: { type: String, unique: true }, //*Stock Keeping Unit وليكن رقم تعريفى لكل نوع و يتعرف عليه في المخزن والشحن والجرد.
  attributes: {
    color: String,
    size: String,
  },
  price: Number,
  stock: { type: Number, min: 0 },
});

export const Product = mongoose.model("Product", productSchema);
export const Variant = mongoose.model("Variant", variantSchema);
