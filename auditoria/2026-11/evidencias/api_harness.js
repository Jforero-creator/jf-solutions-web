// Ejecuta api/contact.js localmente con fetch externo simulado (Cloudflare siteverify y Web3Forms).
const http=require('http'); const handler=require(process.argv[2]); const port=+process.argv[3];
let mode={w3f:'ok'}; const calls=[];
global.fetch=async (url,opt)=>{
  calls.push({url,body:String(opt.body)});
  if(url.includes('siteverify')){ const p=new URLSearchParams(opt.body); return {ok:true,json:async()=>({success:p.get('response')==='PASS-TOKEN'&&!!p.get('secret')})}; }
  if(url.includes('web3forms')){
    if(mode.w3f==='down') throw new Error('net');
    if(mode.w3f==='err') return {ok:false,status:400,json:async()=>({success:false,message:'Invalid'})};
    return {ok:true,status:200,json:async()=>({success:true})};
  }
  throw new Error('unexpected '+url);
};
http.createServer(async (req,res)=>{
  if(req.url.startsWith('/__calls')){res.end(JSON.stringify(calls.splice(0)));return;}
  mode.w3f=req.headers['x-test-w3f']||'ok';
  if(req.headers['x-test-env']) process.env.VERCEL_ENV=req.headers['x-test-env']; else delete process.env.VERCEL_ENV;
  await handler(req,res);
}).listen(port,'127.0.0.1');
