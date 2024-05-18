const fs = require("node:fs");
const path = require("node:path");

const MIME_TYPES = {
  html: "text/html",
  css: "text/css",
  js: "application/javascript",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  txt: "text/plain",
  eot: "application/vnd.ms-fontobject",
  otf: "font/otf",
  ttf: "font/ttf",
  woff: "font/woff",
  woff2: "font/woff2",
};

function processFolder(folderPath, parentFolder) {
  const staticFiles = [];

  // Read the contents of the folder
  const files = fs.readdirSync(folderPath);

  // Loop through the files and subfolders
  for (const file of files) {
    const fullPath = path.join(folderPath, file);

    // Check if it's a directory
    if (fs.statSync(fullPath).isDirectory()) {
      // If it's a directory, recursively process it
      const subfolderFiles = processFolder(fullPath, parentFolder);
      staticFiles.push(...subfolderFiles);
    } else {
      // If it's a file, add it to the array
      const relativePath = path.relative(parentFolder, fullPath);
      const fileExtension = path.extname(file).slice(1);
      if (MIME_TYPES[fileExtension]) staticFiles.push("/" + relativePath);
    }
  }
  console.log(staticFiles);
  return staticFiles;
}

const filesArrayToFilesMap = (filesArray, folderPath) => {
  const filesMap = {};
  for (const file of filesArray) {
    const fileExtension = path.extname(file).slice(1);
    filesMap[file] = {
      path: folderPath + file,
      mime: MIME_TYPES[fileExtension],
    };
  }
  console.log(filesMap);
  return filesMap;
};

const arr = processFolder("./public", "./public");
filesArrayToFilesMap(arr, "./public");
