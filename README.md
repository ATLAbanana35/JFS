# JFS

A small filesystem lib (you put a zip inside, and she return you an array of files, in some blob) a lot of basic FS functions, and a save system (100% in browser)

# Usage :

## 1st, include lib

HTML :

```html
<script src="./jszip.js"></script>
```

JAVASCRIPT :

```javascript
import { FS_init } from "./FS.lib.js";
import { getFilesFromZip } from "./zip.lib.js";
```

## 2nd, init the FileSystem API with a callback function that will be called when everything is ready (the zip will be loaded from internet)

JAVASCRIPT :

```javascript
// Settings
const pathToZipFile = "sampleZip.zip";
const options = {
  /* options for jszip */
};
// Init file system
let files = {};
const FS = new FS_init();
// Check if a FS is already saved
if (!FS.SYSTEM_CHECK_SAVE) {
  // If not load the zip file in the fs from internet
  getFilesFromZip(pathToZipFile, options)
    .then((TMPfiles) => {
      files = TMPfiles;
      // Initialise FS from files
      FS.initialize(files);
      // Save filesystem
      FS.save();
      setTimeout(() => {
        // Reload (if not the directory will not be listed, but only the file, you can delete this and include your own method)
        location.reload();
      }, 1000);
    })
    .catch((error) => {
      // Error?
      console.error("Une erreur s'est produite :", error);
    });
} else {
  // If a FS is already saved just load it
  FS.load(init);
}
```

## Do something in the function init() {}

Now you can use all functions of JFS and FILESYSTEMJS to interact with your filesystem. For example:

- `console.log(FS.dir(""));` all files/directory in a directory (/ is "")

### Example

[example.html](example.html)

### Limitations

This library is made for educational purpose only. It doesn't handle any security issues, but if you want, that's your choice
The "/" don't work (Added in futur?)
And many other things that I forget ...

### CREDITS

Thanks to JSZIP!
[CREDITS](CREDITS)
