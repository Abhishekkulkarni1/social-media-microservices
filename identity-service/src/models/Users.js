const mongoose = require("mongoose");
const argon2 = require("argon2");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);


userSchema.pre("save", async function (next) {
    try {
        if(this.isModified("password")){
            this.password = await argon2.hash(this.password);
        }
    } catch (error) {
        console.log("Error ocurred while hashing the password", error);
        return next(error);
    }
})

userSchema.methods.isValidPassword = async function (password) {
    try {
        return await argon2.verify(this.password, password)
    } catch (error) {
        console.log("Error occured while validating the password", error);
        throw error;
    }
}

userSchema.index({username: "text"});

const User = mongoose.model("User", userSchema);
module.exports = User;

