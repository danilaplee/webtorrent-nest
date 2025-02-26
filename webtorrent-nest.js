const http = require('http');
const { spawn } = require('node:child_process');

const children = {}
const streamFile = (req, res) => {
  const magnetUri = decodeURIComponent(req.url.split('magnet=')?.[1]?.split('&')?.[0])
  if(children[magnetUri]) {
    res.write(JSON.stringify({"res":"done"}))
    res.end()
    return;
  }
  const child = spawn("webtorrent", ["download", magnetUri, "--keep-seeding"], 
  //   (error, stdout, stderr) => {
  //   if (error) {
  //     throw error;
  //   }
  //   console.log(stdout);
  // }
    // {cwd:"/webtorrent"}
  )
  child.stdout.on('data', (data) => {
    console.info('logs', data.toString())
  });
  children[magnetUri] = child
  res.write(JSON.stringify({"res":"done"}))
  res.end()
}

http.createServer((req, res)=> {
  // console.info('req', req.url)
  if(req.url.search("/stream") > -1) {
    try {
      streamFile(req, res)
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
