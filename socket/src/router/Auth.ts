import express from "express"
import User from "../module/User.js";
import z, { success } from "zod";
import dotenv from "dotenv"
dotenv.config()
import jwt from "jsonwebtoken"
import { userMiddleware } from "../middleware.js";
import Chat from "../module/Chat.js";
import multer from "multer"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url";
import ImageKit from "imagekit"
const router=express.Router()
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)
const uploadFolder=path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadFolder)){
    fs.mkdirSync(uploadFolder);
}
const storage = multer.memoryStorage();
const upload = multer({ storage: storage })
const imagekit = new ImageKit({
  publicKey: "public_jxgZI9oGFUcRIhDIujdi0Crt+9A=",
  privateKey: "private_Mt2sQUHZRwCf2mOSXx96H7aZZAQ=",
  urlEndpoint: "https://ik.imagekit.io/j3whydwtk",
});
export const userRegistrationSchema = z.object({
  email: z.string().email({message:"Invalid Formate Email"}),
  password: z.string().min(4,{message:"password must be 4 character"}),
});

router.post("/signup",upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({message:"No file uploaded."});
  const {email, password } = req.body;
   const result=userRegistrationSchema.safeParse({email,password})
   if (!result.success) {
      return res.status(400).json({
        success: false,
        details:result.error.issues.map((issues)=>({
          message:issues.message,
          path:issues.path.join('')
        }))
      });
    }

  if (!email || !password) {
    return res.status(400).json({ message:"Email and password are required"} );
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(404).json({ message: "Email already registered" });
    }

    const basename=email.split('@')[0];
    let username=basename;
    let isUnique=false;
    if (!isUnique) {
      const randomNumber=Math.floor(100+Math.random() * 900)
      const tempUsername=`${basename}${randomNumber}`
      const existing=await User.findOne({username:tempUsername})
      if (!existing) {
        username=tempUsername,
        isUnique=true
      }
    }
    const result = await imagekit.upload({
      file: req.file.buffer,
      fileName: req.file.originalname,
      folder: "/Brainly", 
    });
    console.log(result);
    
    const user = await User.create({username,profileImg:result.url,email, password });
     await user.save()
    return res.status(200).json({
      success: true,
      message: "Signup successful",
      user,
    });
  } catch (error) {
    console.error("Signup error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
});

router.post("/login",async(req,res)=>{
  const {email,password}=req.body
  try {
    const user=await User.findOne({email,password})
    if (!user) return res.status(401).json('user does not exist!')
      const token2=jwt.sign({userId:user._id},process.env.jwt_secretkey || "",{expiresIn:"7d"})
    return res.status(201).json({user,token2})
  } catch (error) {
     console.error("Signup error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      success: false,
      message: "Signup failed",
      error: errorMessage,
    });
  }
})
 router.get("/search",userMiddleware, async (req, res) => {
  try {
    const query = req.query.query;
    if (!query) return res.status(400).json({ message: "Query required" });

    const users = await User.find({
      username: { $regex: query, $options: "i" } 
    }).select("profileImg username email _id");

    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/chat/:roomId",userMiddleware,async(req,res)=>{
  const {roomId}=req.params;
  try {
    const findChat=await Chat.find({room:roomId}).sort({createdAt:1});
    res.status(200).json({findChat})
  } catch (error) {
    return error;
    console.log(error);
  }
})

export default router;