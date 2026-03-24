const express = require("express");
const multer = require("multer");
const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("file"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded." });
        }

        const zip = new AdmZip(req.file.path);
        const extractPath = path.join(__dirname, "extracted", req.file.filename);

        zip.extractAllTo(extractPath, true);

        function readDir(dir) {
            return fs.readdirSync(dir).map(file => {
                const fullPath = path.join(dir, file);
                if (fs.statSync(fullPath).isDirectory()) {
                    return {
                        name: file,
                        type: "folder",
                        children: readDir(fullPath)
                    };
                }
                return { name: file, type: "file" };
            });
        }

        const structure = readDir(extractPath);
        res.json(structure);
    } catch (error) {
        console.error("Error handling upload:", error);
        res.status(400).json({ error: "Invalid file format or failed to read ZIP." });
    }
});

app.listen(5000, () => console.log("Server running on 5000"));