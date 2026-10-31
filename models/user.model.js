import { Schema } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
      maxlength: [50, "Name must be at most 50 characters"],
    },
    email: {
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    index: true //* إنشاء فهرس لهذا الحقل لتسريع البحث بالبريد الإلكتروني
  },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
    },
    passwordConfirmed: {
      type: String,
      required: [true, "Password confirmation is required"],
      minlength: [8, "Password confirmation must be at least 8 characters"],
    },
    role: {
      type: String,
      enum: ["user", "admin", "manager"],
      default: "user",
    },
    profileImage: String,
    active: {
      type: Boolean,
      default: true,
    },
    //* we can add here wishlist and address as empdded? because they are small in size and belong to the user only (not shared across users)
    wishlist: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    addresses: [
      {
        alias: { type: String, required: true },
        details: String,
        phone: String,
        city: String,
        postalCode: String,
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
