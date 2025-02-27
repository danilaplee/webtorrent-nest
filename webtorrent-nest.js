const http = require('http');
const { spawn } = require('node:child_process');
const Redis = require('ioredis')
const redis = new Redis({
  port:6379, 
  host:process.env.REDIS_HOST || "127.0.0.1",
  password:process.env.REDIS_PASSWORD
})
const children = {}
const isRunning = (pid) => {
  try {
    return process.kill(parseInt(pid, 10),0)
  }
  catch (e) {
    return e.code === 'EPERM'
  }
}
const streamFile = async (magnetUri) => {
 
  if(children[magnetUri]) {
    return;
  }
  const pid = await redis.get(magnetUri)
  if(cache && isRunning(pid)) {
    return;
  }
  const child = spawn(
    "webtorrent", 
    ["download", magnetUri, "--keep-seeding"], 
    {cwd:"/webtorrent"}
  )
  children[magnetUri] = child
  child.addListener("exit", ()=>{
    delete children[magnetUri]
  })
  child.stdout.on('data', (data) => {
    console.info('logs', data.toString())
  });
  redis.set(magnetUri, child.pid.toString())
}

const restartEverything = async () => {
  const keys = await redis.keys('*');
  await Promise.all(keys.map(key=>streamFile(key)))
}

http.createServer((req, res)=> {
  if(req.url.search("/stream") > -1) {
    try {
      const magnetUri = decodeURIComponent(req.url.split('magnet=')?.[1]?.split('&')?.[0])
      streamFile(magnetUri).then(()=>{
        res.write(JSON.stringify({"res":"done"}))
        res.end()
      }).catch(()=>{
        res.write(JSON.stringify({"res":"error"}))
        res.end()
      })
    } catch(err) {
      console.error('errror', err)
      res.write(JSON.stringify({"res":"error"}))
      res.end()
    }
  } else {
    res.write(JSON.stringify({"res":"not_found"}))
    res.end()
  }
  // res.write(JSON.stringify({"res":'Hello World!'})); //write a response to the client
  // res.end(); //end the response
}).listen(process.env.PORT || 7071) //the server object listens on port 8080
.on('error',(err)=>{
  console.error('unhandled error', err?.message)
})
.addListener("error", (err)=>{
  console.error('unhandled error', err?.message)
})
restartEverything()