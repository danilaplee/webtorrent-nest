module.exports = {
  fileKey:"torrentFile_",
  magnetKey:"magnetKey_",
  redis:{
    port:6379, 
    host:process.env.REDIS_HOST || "127.0.0.1",
    password:process.env.REDIS_PASSWORD
  },
  announce:["https://media.starpy.me", "wss://media.starpy.me"]
}