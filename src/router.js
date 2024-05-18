// Controllers
const User = require("./controllers/user");
const Video = require("./controllers/video");

module.exports = (server) => {
  // ------------------------------------------------ //
  // ************ USER ROUTES ************* //
  // ------------------------------------------------ //

  // Log a user in and give them a token
  server.route("post", "/api/login", User.logUserIn);

  // Log a user out
  server.route("delete", "/api/logout", User.logUserOut);

  // Send user info
  server.route("get", "/api/user", User.sendUserInfo);

  // Update a user info
  server.route("put", "/api/user", User.updateUser);

  // Get user by Id
  server.route("get", "/api/user/:uid", User.getUserById);

  // ------------------------------------------------ //
  // ************ Video ROUTES ************* //
  // ------------------------------------------------ //

  server.route("get", "/api/videos", Video.getVideos);

  // upload video file
  server.route("post", "/api/upload-video", Video.uploadVideo);

  // extract audio
  server.route("patch", "/api/video/extract-audio", Video.extractAudio);

  // resize video (Creates a new video file)
  server.route("put", "/api/video/resize", Video.resize);

  // get video assests
  server.route("get", "/get-video-asset", Video.getVideoAsset);
};
