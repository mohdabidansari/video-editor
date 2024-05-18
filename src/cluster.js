const cluster = require("node:cluster");
const JobQueue = require("../lib/JobQueue");

if (cluster.isPrimary) {
  const jobs = new JobQueue();
  const coresCount = require("node:os").availableParallelism();

  for (let i = 0; i < coresCount; i++) {
    cluster.fork();
  }

  cluster.on("message", (worker, message) => {
    console.log(
      `A new message from worker ${worker.process.pid}: ${message.messageType}`
    );
    if (message.messageType === "new-resize") {
      const { videoId, width, height } = message.data;
      jobs.enqueue({
        type: "resize",
        videoId,
        width,
        height,
      });
    }
  });

  cluster.on("exit", (worker, code, signal) => {
    console.log(
      `Worker with PID:${worker.process.pid} died (${
        signal || code
      }). Restarting...`
    );

    cluster.fork();
  });
} else {
  require("./index");
}
