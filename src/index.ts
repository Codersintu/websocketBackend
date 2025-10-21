import { WebSocketServer, WebSocket } from "ws";
const wss = new WebSocketServer({
    port: 8080
});
interface User {
    socket: WebSocket,
    room: string;
}
let userCount=0;
let allSocket:User[]=[];
wss.on("connection",function(socket){
    console.log("a user connected")
    userCount++;
    socket.on("message",(message)=>{
        // @ts-ignore
        const parsedMessage=JSON.parse(message as unknown as string);
        if (parsedMessage.type === "join") {
            console.log("a user joined room: "+parsedMessage.payload.roomId);
            allSocket.push({
                socket,
                room: parsedMessage.payload.roomId
            });
        }
        if (parsedMessage.type === "chat") {
            console.log("a user sent message: "+parsedMessage.payload.message);
            const currentUserRoom=allSocket.find((user)=>user.socket == socket)?.room;
            allSocket.forEach((user)=>{
                if(user.room == currentUserRoom ){
                    user.socket.send(JSON.stringify({
                       type: "chat",
                       payload: {   
                       sender: parsedMessage.payload.sender,
                       message: parsedMessage.payload.message,
                       }
                }));
                }
            })
        }
    })
})