const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const express = require("express");
const mongoose = require("mongoose");
const GridFsStorage = require("multer-gridfs-storage");

const app = express();
app.use(express.json({ extended: true }));
app.set("view engine", "ejs");

const MongoUri = "mongodb://127.0.0.1:27017/mongodb-file-upload-gridfs";
mongoose.connect(MongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const conn = mongoose.connection;

let gfs;
conn.once("open", () => {
  // gfs = Grid(conn.db, mongoose.mongo);
  // gfs.collection("uploads");
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "uploads"
  });
});

const storage = new GridFsStorage({
  url: MongoUri,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString("hex") + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: "uploads"
        };
        resolve(fileInfo);
      });
    });
  }
});

const upload = multer({ storage });

app.get("/", (req, res) => {
  gfs.find().toArray((err, files) => {
    if (!files || files.length === 0) {
      res.render("index", { files: false });
    } else {
      files.map(file => {
        if (
          file.contentType === "image/jpeg" ||
          file.contentType === "image/png"
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render("index", { files: files });
    }
  });
});

app.post("/upload", upload.single("file"), (req, res) => {
  res.redirect("/");
});

app.get("/image/:filename", async (req, res) => {
  gfs
    .find({
      filename: req.params.filename
    })
    .toArray((err, files) => {
      if (!files || files.length === 0) {
        return res.status(404).json({
          err: "no files exist"
        });
      }
      gfs.openDownloadStreamByName(req.params.filename).pipe(res);
    });
});

app.get("/files", (req, res) => {
  gfs.find().toArray((err, files) => {
    if (!files || files.length === 0) {
      return res.status(404).json({ err: "No File Found" });
    }
    return res.json(files);
  });
});

app.get("/files/:filename", (req, res) => {
  const file = gfs.find({ filename: req.params.filename });
  gfs.find({ filename: req.params.filename }).toArray((err, file) => {
    if (!file || file.length === 0) {
      return res.status(404).json({ err: "No File Found" });
    }
    return res.json(file[0]);
  });
});

app.post("/files/:id", (req, res) => {
  gfs.delete(new mongoose.Types.ObjectId(req.params.id), (err, data) => {
    if (err) {
      return res.status(404).json({ err: "Something went wrong" });
    }
    res.redirect("/");
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server is running http://localhost:" + PORT);
});
