import mongoose from "mongoose";

const chatSchema=new mongoose.Schema({
  room: { type: String, required: true },
  sender: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
},{timestamps:true})
const Chat=mongoose.model("Chat",chatSchema)
export default Chat;