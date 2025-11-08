import type { Request,Response,NextFunction } from "express"
import dotenv from "dotenv"
dotenv.config()
import jwt from "jsonwebtoken"

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
export function userMiddleware(req:Request,res:Response,next:NextFunction){
    const header=req.headers["authorization"];
    const decode=jwt.verify(header as string,process.env.jwt_secretkey || "") as {id:string} | undefined
    if (decode) {
        req.userId=decode.id
        next()
    }else{
        return res.status(403).json("please logIn dude!")
    }


}