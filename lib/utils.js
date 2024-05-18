const fs = require("node:fs/promises");

const deleteFile = async (path) => {
  try {
    await fs.unlink(path);
  } catch (error) {}
};

const deleteFolder = async (path) => {
  try {
    await fs.rm(path, { recursive: true });
  } catch (error) {}
};

const utils = { deleteFile, deleteFolder };

module.exports = utils;
