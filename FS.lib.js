import { createZipFromFiles, getFilesFromZip } from "./zip.lib.js";

export function FS_init() {
  this.merge = (FS, folder) => {
    for (const file_name in FS.filesystem) {
      if (Object.hasOwnProperty.call(FS.filesystem, file_name)) {
        let element = FS.filesystem[file_name];
        element["filename"] = folder + file_name;
        this.filesystem[folder + file_name] = element;
      }
    }
    this.save();
    return true;
  };
  this.runIncompatibleCommand = (
    command,
    args1,
    args2,
    optionForce = false,
    optionRecursive = false
  ) => {
    if (args2 && args2 !== "undef") {
      this[command](args1, args2, {
        force: optionForce,
        recursive: optionRecursive,
      });
    } else if (args1) {
      this[command](args1, { force: optionForce, recursive: optionRecursive });
    }
  };
  this.loadCss = (BlobURL, doc, rootPath = "") => {
    const self = this;
    function CSSLoad() {
      doc.querySelectorAll("*").forEach((HtmlElement) => {
        const value = window
          .getComputedStyle(HtmlElement)
          .getPropertyValue("background-image");
        if (
          value.includes('url("') &&
          value.split('url("')[1].split('"')[0].startsWith(location.origin)
        ) {
          HtmlElement.style.backgroundImage =
            'url("' +
            self.getPath(
              rootPath +
                value
                  .split('url("')[1]
                  .split('"')[0]
                  .replace(location.origin, "")
                  .replace("/", "")
            ) +
            '")';
        }
      });
    }
    if (typeof BlobURL !== "string") {
      throw new Error("BlobURL must be a string! Not " + typeof BlobURL);
    }
    var head = doc.getElementsByTagName("head")[0];
    var link = doc.createElement("link");
    link.id = "CustomBLOB_CSS_LINK";
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = BlobURL;
    link.media = "all";
    link.onload = CSSLoad;
    head.appendChild(link);
  };
  this.SYSTEM_CHECK_SAVE = localStorage.getItem("SYSTEM_CHECK_SAVE") === "true";
  this.files = {};
  this.filesystem = {};
  this.initialize = (file) => {
    this.files = file;
    this.filesystem = this.GetFilesystem();
  };
  this.getPath = (path) => {
    if (typeof path !== "string") {
      throw new Error("Path must be a string! Not " + typeof path);
    }
    if (!this.file_exist(path)) {
      return false;
    }
    return this.filesystem[path]["blobURL"];
  };
  this.dir = (dirPath) => {
    const totalArray = [];
    for (const fileName in this.filesystem) {
      if (Object.hasOwnProperty.call(this.filesystem, fileName)) {
        const file = this.filesystem[fileName].filename;
        if (
          file.startsWith(dirPath) &&
          file.replace(dirPath, "").split("/").length === 1 &&
          dirPath + file.replace(dirPath, "").split("/")[0] !== dirPath
        ) {
          totalArray.push(file);
        } else if (
          file.startsWith(dirPath) &&
          totalArray.indexOf(
            dirPath + file.replace(dirPath, "").split("/")[0] + "/"
          ) === -1 &&
          dirPath + file.replace(dirPath, "").split("/")[0] !== dirPath
        ) {
          totalArray.push(
            dirPath + file.replace(dirPath, "").split("/")[0] + "/"
          );
        }
      }
    }
    return totalArray;
  };
  this.GetFilesystem = () => {
    if (!this.files) {
      throw new Error("Files not defined. Call initialize first.");
    }
    let filesystem = {};
    for (const element of this.files) {
      filesystem[element.filename] = element;
    }
    return filesystem;
  };

  this.save = function () {
    localStorage.setItem("SYSTEM_CHECK_SAVE", true);
    self = this;
    this.SYSTEM_CHECK_SAVE = true;
    createZipFromFiles(this.filesystem)
      .then((zipBlob) => {
        // Ouvrir ou créer une base de données IndexedDB
        const dbName = "filesystem";
        const request = indexedDB.open(dbName, 1);

        request.onupgradeneeded = function (event) {
          // Créer un objet de stockage dans la base de données
          const db = event.target.result;
          db.createObjectStore("zipFiles", { keyPath: "id" });
        };

        request.onsuccess = function (event) {
          const db = event.target.result;

          // Convertir le blob en tableau d'octets
          const reader = new FileReader();
          reader.onload = function () {
            const arrayBuffer = reader.result;

            // Enregistrer le tableau d'octets dans IndexedDB
            const transaction = db.transaction("zipFiles", "readwrite");
            const store = transaction.objectStore("zipFiles");
            store.put({ id: 1, data: arrayBuffer });

            console.log(
              "Le fichier ZIP a été enregistré avec succès dans IndexedDB."
            );
          };

          reader.readAsArrayBuffer(zipBlob);
        };

        request.onerror = function (event) {
          console.error(
            "Erreur lors de l'ouverture de la base de données:",
            event.target.errorCode
          );
        };
      })
      .catch((error) => {
        console.error(
          "Une erreur s'est produite lors de la création du fichier ZIP :",
          error
        );
      });
  };
  this.load = function (NextFunction) {
    self = this;
    // Ouvrir la base de données IndexedDB
    const dbName = "filesystem";
    const request = indexedDB.open(dbName, 1);

    request.onsuccess = function (event) {
      const db = event.target.result;

      // Récupérer le fichier ZIP depuis IndexedDB
      const transaction = db.transaction("zipFiles", "readonly");
      const store = transaction.objectStore("zipFiles");
      const getRequest = store.get(1); // Assuming the key is 1, update it accordingly

      getRequest.onsuccess = function (event) {
        const storedData = event.target.result;
        if (storedData) {
          // Convertir le tableau d'octets en blob
          const zipBlob = new Blob([storedData.data]);

          // Charger le contenu du fichier ZIP
          getFilesFromZip(URL.createObjectURL(zipBlob) /* options if needed */)
            .then((files) => {
              self.files = files;
              self.filesystem = self.GetFilesystem();
              NextFunction();
              // Faites quelque chose avec les fichiers chargés, par exemple, affichez-les dans la console
            })
            .catch((error) => {
              console.error(
                "Erreur lors du chargement du fichier ZIP :",
                error
              );
            });
        } else {
          console.error(
            "Aucun fichier ZIP trouvé dans IndexedDB avec la clé spécifiée."
          );
        }
      };

      getRequest.onerror = function (event) {
        console.error(
          "Erreur lors de la récupération du fichier ZIP depuis IndexedDB:",
          event.target.errorCode
        );
      };
    };

    request.onerror = function (event) {
      console.error(
        "Erreur lors de l'ouverture de la base de données IndexedDB:",
        event.target.errorCode
      );
    };
  };
  this.read = (Path, AfterFunction) => {
    if (typeof Path !== "string") {
      throw new Error("Path must be a string! Not " + typeof path);
    }
    const file_reader = new FileReader();
    file_reader.onload = () => {
      AfterFunction(file_reader.result);
    };
    file_reader.readAsText(this.filesystem[Path]["blob"]);
  };
  this.write = (Path, Text) => {
    if (typeof Path !== "string") {
      throw new Error("Path must be a string! Not " + typeof path);
    }
    var blobFromText = new Blob([Text], {
      type: "text/plain",
    });
    if (this.file_exist(Path)) {
      this.filesystem[Path] = {
        filename: Path,
        blob: blobFromText,
        blobURL: URL.createObjectURL(blobFromText),
        lastModDate: new Date(),
        uncompressedSize: blobFromText.size,
        isDirectory: false,
      };
    } else {
      this.filesystem[Path] = {
        filename: Path,
        blob: blobFromText,
        blobURL: URL.createObjectURL(blobFromText),
        lastModDate: new Date(),
        uncompressedSize: blobFromText.size,
        isDirectory: false,
      };
    }
    this.save();
  };
  this.file_exist = (Path) => {
    let file = this.filesystem[Path];
    if (file === undefined) {
      return false;
    } else {
      return true;
    }
  };
  this.mkdir = (Path) => {
    if (typeof Path !== "string") {
      throw new Error("Path must be a string! Not " + typeof Path);
    }
    if (!this.file_exist(Path)) {
      var blobFromText = new Blob([""], {
        type: "text/plain",
      });
      this.filesystem[Path] = {
        filename: Path,
        blob: blobFromText,
        blobURL: URL.createObjectURL(blobFromText),
        lastModDate: new Date(),
        uncompressedSize: blobFromText.size,
        isDirectory: true,
      };
    } else {
      throw new Error("Path MUST not exist!");
    }
  };
  this.rmdir = (Path, options = { force: false, recursive: false }) => {
    if (typeof Path !== "string") {
      throw new Error("Path must be a string! Not " + typeof Path);
    }

    if (!this.file_exist(Path)) {
      throw new Error("Directory not found!");
    }

    if (!this.filesystem[Path].isDirectory) {
      throw new Error("Path is not a directory!");
    }

    if (!options.force && this.dir(Path).length > 0) {
      throw new Error("Directory is not empty! Use force option to delete.");
    }

    if (!options.recursive && this.dir(Path).length > 0) {
      throw new Error(
        "Directory is not empty! Use recursive option to delete."
      );
    }

    // Remove the directory
    delete this.filesystem[Path];

    // Recursively remove subdirectories and files if recursive option is true
    if (options.recursive) {
      this.dir(Path).forEach((item) => {
        if (this.filesystem[item].isDirectory) {
          // Recursive call to remove subdirectories
          this.rmdir(item, options);
        } else {
          // Remove files
          delete this.filesystem[item];
        }
      });
    }
  };
  this.rm = (Path) => {
    if (typeof Path !== "string") {
      throw new Error("Path must be a string! Not " + typeof Path);
    }
    if (this.file_exist(Path)) {
      delete this.filesystem[Path];
    } else {
      throw new Error("File not found!");
    }
  };
  this.mv = (sourcePath, destinationPath) => {
    if (typeof sourcePath !== "string" || typeof destinationPath !== "string") {
      throw new Error("Paths must be strings!");
    }

    if (!this.file_exist(sourcePath)) {
      throw new Error("Source path not found!");
    }

    // Copy the file or directory to the destination
    this.cp(sourcePath, destinationPath);

    // Remove the source file or directory
    this.rm(sourcePath);
  };

  this.cp = (sourcePath, destinationPath) => {
    if (typeof sourcePath !== "string" || typeof destinationPath !== "string") {
      throw new Error("Paths must be strings!");
    }

    if (!this.file_exist(sourcePath)) {
      throw new Error("Source path not found!");
    }

    const sourceItem = this.filesystem[sourcePath];

    // If the source is a directory, recursively copy its contents
    if (sourceItem.isDirectory) {
      const newDestinationPath = destinationPath + sourceItem.filename;
      this.mkdir(newDestinationPath);

      // Copy the contents of the directory
      this.dir(sourcePath).forEach((item) => {
        this.cp(item, newDestinationPath);
      });
    } else {
      // If the source is a file, copy it to the destination
      const blobCopy = new Blob([sourceItem.blob], {
        type: sourceItem.blob.type,
      });
      this.filesystem[destinationPath] = {
        filename: destinationPath,
        blob: blobCopy,
        blobURL: URL.createObjectURL(blobCopy),
        lastModDate: new Date(),
        uncompressedSize: blobCopy.size,
        isDirectory: false,
      };
    }
  };

  this.mvdir = (
    sourcePath,
    destinationPath,
    options = { force: false, recursive: false }
  ) => {
    if (typeof sourcePath !== "string" || typeof destinationPath !== "string") {
      throw new Error("Paths must be strings!");
    }
    if (!this.file_exist(sourcePath)) {
      throw new Error("Source path not found!");
    }

    if (this.file_exist(destinationPath) && !options.force) {
      throw new Error("Destination path already exists!");
    }

    const sourceItem = this.filesystem[sourcePath];

    if (!sourceItem.isDirectory) {
      throw new Error("Source path is not a directory!");
    }

    // Move the directory to the destination
    this.mkdir(destinationPath);

    // Copy the contents of the directory
    this.dir(sourcePath).forEach((item) => {
      const newItemPath = destinationPath + item.replace(sourcePath, "");
      if (
        this.file_exist(item) &&
        this.filesystem[item].isDirectory &&
        options.recursive
      ) {
        this.mvdir(item, newItemPath, options);
      } else {
        this.cp(item, newItemPath);
      }
    });

    // Remove the source directory and its contents
    if (options.recursive) {
      this.rmdir(sourcePath, { force: true, recursive: true });
    } else {
      this.rmdir(sourcePath, { force: true, recursive: false });
    }
  };

  this.cpdir = (
    sourcePath,
    destinationPath,
    options = { force: false, recursive: false }
  ) => {
    if (typeof sourcePath !== "string" || typeof destinationPath !== "string") {
      throw new Error("Paths must be strings!");
    }

    if (!this.file_exist(sourcePath)) {
      throw new Error("Source path not found!");
    }

    if (this.file_exist(destinationPath) && !options.force) {
      throw new Error("Destination path already exists!");
    }

    const sourceItem = this.filesystem[sourcePath];

    if (!sourceItem.isDirectory) {
      throw new Error("Source path is not a directory!");
    }

    // Copy the directory to the destination
    this.mkdir(destinationPath);

    // Copy the contents of the directory
    this.dir(sourcePath).forEach((item) => {
      const newItemPath = destinationPath + item.replace(sourcePath, "");
      console.log(item);
      if (
        this.file_exist(item) &&
        this.filesystem[item].isDirectory &&
        options.recursive
      ) {
        this.cpdir(item, newItemPath, options);
      } else {
        this.cp(item, newItemPath);
      }
    });
  };
}
