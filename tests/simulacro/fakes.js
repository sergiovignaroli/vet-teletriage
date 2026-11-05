const http=require("http"),net=require("net"),fs=require("fs");
const L=__dirname+"/fakes.log"; const log=[]; const save=()=>fs.writeFileSync(L,JSON.stringify(log));
http.createServer((req,res)=>{if(req.url==="/__reset"){log.length=0;save();return res.end("ok");}let b="";req.on("data",c=>b+=c);req.on("end",()=>{log.push({canal:"whatsapp",url:req.url,auth:req.headers.authorization,body:JSON.parse(b||"{}")});save();res.setHeader("content-type","application/json");res.end('{"messages":[{"id":"x"}]}');});}).listen(4500);
net.createServer(sock=>{let data=false,buf="",mail={to:[],body:""};const w=s=>sock.write(s+"\r\n");w("220 fake");
 sock.on("data",d=>{ if(data){mail.body+=d.toString(); if(mail.body.endsWith("\r\n.\r\n")){log.push({canal:"email",to:mail.to,body:mail.body});save();data=false;w("250 ok");mail={to:[],body:""};} return;}
  buf+=d.toString(); let i; while((i=buf.indexOf("\r\n"))>=0){const l=buf.slice(0,i);buf=buf.slice(i+2);
   if(/^EHLO|^HELO/i.test(l)){sock.write("250-fake\r\n250 AUTH PLAIN LOGIN\r\n");}
   else if(/^AUTH PLAIN/i.test(l)){w("235 ok");} else if(/^AUTH LOGIN/i.test(l)){w("334 VXNlcm5hbWU6");}
   else if(/^MAIL FROM/i.test(l)){w("250 ok");} else if(/^RCPT TO/i.test(l)){mail.to.push(l.slice(8));w("250 ok");}
   else if(/^DATA/i.test(l)){data=true;w("354 go");} else if(/^QUIT/i.test(l)){w("221 bye");sock.end();} else if(/^RSET|^NOOP/i.test(l)){w("250 ok");}
   else {w("334 UGFzc3dvcmQ6");} } });
}).listen(4525);
