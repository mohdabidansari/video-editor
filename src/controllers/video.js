const path = require("node:path");
const cluster = require("node:cluster");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const { pipeline } = require("node:stream/promises");
const { deleteFolder, deleteFile } = require("../../lib/utils");
const DB = require("../DB");
const FF = require("../../lib/FF");
const JobQueue = require("../../lib/JobQueue");

let jobs;
if (cluster.isPrimary) {
  jobs = new JobQueue();
}
const SUPPORTED_FORMATS = ["mov", "mp4"];

// Get all videos uploaded by tje logged in user
const getVideos = (req, res, handleErr) => {
  DB.update();
  const videos = DB.videos.filter((video) => video.userId === req.userId);

  res.status(200).json(videos);
};

const uploadVideo = async (req, res, handleErr) => {
  const specifiedFileName = req.headers.filename;
  const extension = path.extname(specifiedFileName).slice(1).toLowerCase();
  const name = path.parse(specifiedFileName).name;
  const videoId = crypto.randomBytes(4).toString("hex");
  const folderPath = `./storage/${videoId}`;
  const fullPath = `${folderPath}/original.${extension}`;
  const thumbnailPath = `${folderPath}/thumbnail.jpg`;

  if (!SUPPORTED_FORMATS.includes(extension)) {
    return handleErr({
      status: 400,
      message: `Only theses formats are supported: ${SUPPORTED_FORMATS.join(
        ", "
      )}`,
    });
  }

  try {
    await fs.mkdir(folderPath);
    const file = await fs.open(fullPath, "w");
    const fileStream = file.createWriteStream();

    await pipeline(req, fileStream);

    // Make thumbnail from the video using ffmpeg
    await FF.makeThumbnail(fullPath, thumbnailPath);

    // Get the dimensions of the video using ffmpeg
    const dimensions = await FF.getDimensions(fullPath);

    DB.update();
    DB.videos.unshift({
      id: DB.videos.length,
      videoId,
      name,
      dimensions,
      extension,
      userId: req.userId,
      extractedAudio: false,
      resizes: {},
    });
    DB.save();

    res.status(201).json({
      status: "success",
      message: "The file was uploaded successfully",
    });
  } catch (error) {
    deleteFolder(folderPath);
    if (error.code !== "ECONNRESET") return handleErr(error);
  }
};

// Return a video asset to the client
const getVideoAsset = async (req, res, handleErr) => {
  res.on("end", () => console.log("RESPONSE STREAM ENDED"));
  req.on("end", () => console.log("REQ STREAM ENDED"));

  const videoId = req.params.get("videoId");
  const type = req.params.get("type"); // thumbnail, original, audio, resize

  DB.update();
  const video = DB.videos.find((video) => video.videoId === videoId);

  if (!video) {
    return handleErr({
      status: 404,
      message: "Video not found!",
    });
  }

  let file;
  let mimeType;
  let filename; // the final file name for the download (including the extension)

  console.log({ type });
  switch (type) {
    case "thumbnail":
      file = await fs.open(`./storage/${videoId}/thumbnail.jpg`, "r");
      mimeType = "image/jpeg";
      break;
    case "audio":
      file = await fs.open(`./storage/${videoId}/audio.aac`, "r");
      mimeType = "audio/aac";
      filename = `${video.name}-audio.aac`;
      break;
    case "resize":
      const dimensions = req.params.get("dimensions");
      file = await fs.open(
        `./storage/${videoId}/${dimensions}.${video.extension}`,
        "r"
      );
      mimeType = "video/mp4"; // Not a good practice! Videos are not always MP4
      filename = `${video.name}-${dimensions}.${video.extension}`;
      break;
    case "original":
      file = await fs.open(
        `./storage/${videoId}/original.${video.extension}`,
        "r"
      );
      mimeType = "video/mp4"; // Not a good practice! Videos are not always MP4
      filename = `${video.name}.${video.extension}`;
      break;
  }

  console.log({ filename });

  try {
    // Grab the file size
    const stat = await file.stat();

    const fileStream = file.createReadStream();

    if (type !== "thumbnail") {
      // Set a header to prompt for download
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    }

    // Set the Content-Type header based on the file type
    res.setHeader("Content-Type", mimeType);
    // Set the Content-Length to the size of the file
    res.setHeader("Content-Length", stat.size);

    res.status(200);

    // await pipeline(fileStream, res);   // THIS THROWS ERROR
    // file.close();

    fileStream.pipe(res); // THIS WORKS
    fileStream.on("end", () => {
      console.log("FILE STREAM ENDED");
      file.close();
      fileStream.close();
    });
  } catch (e) {
    console.log(e);
  }
};

// Extract audio
const extractAudio = async (req, res, handleErr) => {
  const videoId = req.params.get("videoId");

  DB.update();
  const video = DB.videos.find((video) => video.videoId === videoId);

  if (!video) {
    return handleErr({
      status: 404,
      message: "Video not found!",
    });
  }

  if (video.extractedAudio) {
    return handleErr({
      status: 400,
      message: "The audio has already been extracted for this video.",
    });
  }

  const fullPath = `./storage/${videoId}`;
  const videoPath = `${fullPath}/original.${video.extension}`;
  const audioPath = `${fullPath}/audio.aac`;

  try {
    await FF.extractAudioFromVideo(videoPath, audioPath);
    video.extractedAudio = true;
    DB.save();

    res.status(201).json({
      status: "Success",
      message: "Audio extracted successfully",
    });
  } catch (error) {
    await deleteFile(audioPath);
    console.log(error);
    handleErr(error);
  }
};

const resize = async (req, res, handleErr) => {
  const { videoId, height, width } = req.body;

  if (!videoId || !height || !width) {
    return handleErr({
      status: 400,
      message: "Width, height and video id is required.",
    });
  }

  DB.update();
  const video = DB.videos.find((video) => video.videoId === videoId);

  if (!video) {
    return handleErr({
      status: 404,
      message: "Video not found!",
    });
  }

  const resizeDimensions = `${width}x${height}`;

  video.resizes[resizeDimensions] = { processing: true };
  DB.save();

  if (cluster.isPrimary) {
    jobs.enqueue({
      type: "resize",
      videoId,
      width,
      height,
    });
  } else {
    process.send({
      messageType: "new-resize",
      data: {
        videoId,
        width,
        height,
      },
    });
  }

  res.status(201).json({
    status: "Success",
    message: "Resize job scheduled",
  });
};

const controller = {
  getVideos,
  uploadVideo,
  getVideoAsset,
  extractAudio,
  resize,
};

module.exports = controller;
