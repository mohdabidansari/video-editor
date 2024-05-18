const { spawn } = require("node:child_process");

const makeThumbnail = async (fullPath, thumbnailPath) => {
  // ffmpeg -i FOR\ YOU\ MY\ LORD\ -\ BEAUTIFUL\ NASHEED.mp4 -ss 5 -vframes 1 thumbnail.jpg

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      fullPath,
      "-ss",
      "5",
      "-vframes",
      "1",
      thumbnailPath,
    ]);
    ffmpeg.on("close", (code) => {
      console.log(`FFmpeg process closed with code: ${code}`);
      if (code === 0) {
        resolve();
      } else {
        reject(`FFmpeg process closed with code: ${code}`);
      }
    });

    ffmpeg.on("error", (error) => {
      console.error(error);
      reject(error);
    });
  });
};

const getDimensions = async (fullPath) => {
  // ffprobe -v error -select_streams v -show_entries stream=width,height -of json input.mkv

  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v",
      "-show_entries",
      "stream=width,height",
      "-of",
      "json",
      fullPath,
    ]);

    let dimensionsJson = "";

    ffprobe.stdout.on("data", (data) => {
      dimensionsJson += data.toString("utf-8");
      //   console.log(dimensionsJson);
    });

    ffprobe.on("close", (code) => {
      console.log(`FFprobe process closed with code: ${code}`);
      if (code === 0) {
        const dimensions = JSON.parse(dimensionsJson).streams[0];
        resolve(dimensions);
      } else {
        reject(`FFprobe process closed with code: ${code}`);
      }
    });

    ffprobe.on("error", (err) => {
      console.error(err);
      reject();
    });
  });
};

const extractAudioFromVideo = async (videoPath, audioPath) => {
  // ffmpeg -i input-video.avi -vn -acodec copy output-audio.aac

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      videoPath,
      "-vn",
      "-acodec",
      "copy",
      audioPath,
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          `Could not extract audio. FFmpeg process exited with code ${code}`
        );
      }
    });

    ffmpeg.on("error", (error) => {
      console.error(error);
      reject(error);
    });
  });
};

const resizeVideo = async (videoPath, resizePath, width, height) => {
  // ffmpeg -i input.mp4 -vf scale=width:height -c:a copy output.mp4
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      videoPath,
      "-vf",
      `scale=${width}:${height}`,
      "-c:a",
      "copy",
      "-threads",
      "2",
      "-y",
      resizePath,
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          `Could not resize video. FFmpeg process exited with code ${code}`
        );
      }
    });

    ffmpeg.on("error", (error) => {
      console.error(error);
      reject(error);
    });
  });
};

module.exports = {
  makeThumbnail,
  getDimensions,
  extractAudioFromVideo,
  resizeVideo,
};
