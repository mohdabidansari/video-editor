const DB = require("../src/DB");
const { deleteFile } = require("./utils");
const FF = require("../lib/FF");

class JobQueue {
  constructor() {
    this.jobs = [];
    this.currentJob = null;

    DB.update();
    DB.videos.forEach((video) => {
      const resizesArray = Object.keys(video.resizes);
      resizesArray.forEach((r) => {
        if (video.resizes[r].processing) {
          const [width, height] = r.split("x");
          this.enqueue({
            type: "resize",
            videoId: video.videoId,
            width,
            height,
          });
        }
      });
    });
  }

  enqueue(job) {
    this.jobs.push(job);
    this.executeNext();
  }

  dequeue() {
    return this.jobs.shift();
  }

  executeNext() {
    if (this.currentJob) return;
    this.currentJob = this.dequeue();
    if (!this.currentJob) return;
    this.execute(this.currentJob);
  }

  async execute(job) {
    if (job.type === "resize") {
      DB.update();
      const video = DB.videos.find((video) => video.videoId === job.videoId);

      const resizeDimensions = `${job.width}x${job.height}`;

      const fullPath = `./storage/${job.videoId}`;
      const videoPath = `${fullPath}/original.${video.extension}`;
      const resizePath = `${fullPath}/${resizeDimensions}.${video.extension}`;

      try {
        await FF.resizeVideo(videoPath, resizePath, job.width, job.height);

        DB.update();
        const video = DB.videos.find((video) => video.videoId === job.videoId); // For maintaining Consistency in DB. ACID properties

        video.resizes[resizeDimensions].processing = false;
        DB.save();
        console.log("Done with job => ", job);
      } catch (error) {
        await deleteFile(resizePath);
        console.log(error);
      }
    }

    this.currentJob = null;
    this.executeNext();
  }
}

module.exports = JobQueue;
