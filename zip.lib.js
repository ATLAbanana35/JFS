export async function createZipFromFiles(files) {
  const zip = new JSZip();

  for (const fileName in files) {
    if (Object.hasOwnProperty.call(files, fileName)) {
      let fileContent = files[fileName];
      zip.file(fileName, fileContent.blob, { binary: true });
    }
  }

  return zip.generateAsync({ type: "blob" });
}

export async function getFilesFromZip(path, options) {
  const model = {
    async getEntries(file, options) {
      const zip = await JSZip.loadAsync(file);
      const entries = [];

      zip.forEach((relativePath, zipEntry) => {
        entries.push(zipEntry);
      });

      return entries;
    },
    async getURL(entry, options) {
      return entry.async("blob").then((blob) => {
        if (entry.name.split(".")[entry.name.split(".").length - 1] === "js") {
          return blob.slice(0, blob.size, "text/javascript");
        }
        if (entry.name.split(".")[entry.name.split(".").length - 1] === "svg") {
          return blob.slice(0, blob.size, "image/svg+xml");
        }
        if (
          entry.name.split(".")[entry.name.split(".").length - 1] === "json"
        ) {
          return blob.slice(0, blob.size, "application/json");
        }
        return blob;
      });
    },
  };

  try {
    const response = await fetch(path);
    const arrayBuffer = await response.arrayBuffer();
    const selectedFile = new Blob([arrayBuffer]);

    const entries = await model.getEntries(selectedFile, options);

    if (entries && entries.length) {
      const files = entries.map(async (entry) => {
        const blob = await model.getURL(entry, options);
        return {
          filename: entry.name,
          blob: blob,
          blobURL: URL.createObjectURL(blob),
          lastModDate: entry.date,
          uncompressedSize: entry.uncompressedSize,
          isDirectory: entry.dir,
        };
      });

      return Promise.all(files);
    }
  } catch (error) {
    throw error;
  }
}
