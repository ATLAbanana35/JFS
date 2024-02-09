import { FS_init } from "./FS.lib.js";
import { getFilesFromZip } from "./zip.lib.js";
const pathToZipFile = "sampleZip.zip";
const options = {
  /* options for jszip */
};
let files = {};
const FS = new FS_init();
document.querySelector(".reset").addEventListener("click", () => {
  localStorage.clear();
  location.reload();
});
function editor(file) {
  FS.read(file, (result) => {
    document.querySelector("#editor").value = result;
    document.querySelector(".saveEditor").onclick = () => {
      FS.write(file, document.querySelector("#editor").value);
      alert("saved!");
    };
  });
}
function tree(dir) {
  document.querySelector(".dir").innerHTML = "";
  let rootFiles = FS.dir(dir);
  rootFiles.forEach((element) => {
    document.querySelector(".dir").innerHTML += `
    <div class="file" data-name="${element}">${element}</div>
    `;
  });
  document.querySelectorAll(".file").forEach((element) => {
    element.onclick = (e) => {
      if (!files[e.target.getAttribute("data-name")]) {
        if (FS.filesystem[e.target.getAttribute("data-name")].isDirectory) {
          tree(e.target.getAttribute("data-name"));
        } else {
          editor(e.target.getAttribute("data-name"));
        }
      }
    };
  });
}
function init() {
  tree("");
}
if (!FS.SYSTEM_CHECK_SAVE) {
  getFilesFromZip(pathToZipFile, options)
    .then((TMPfiles) => {
      files = TMPfiles;
      FS.initialize(files);
      FS.save();
      setTimeout(() => {
        location.reload();
      }, 1000);
    })
    .catch((error) => {
      console.error("Une erreur s'est produite :", error);
    });
} else {
  FS.load(init);
}
