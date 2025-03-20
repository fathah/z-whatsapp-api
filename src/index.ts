import { config } from "dotenv";
import path, { join } from "path";
import bodyParser from "body-parser";
import express from "express";
import multer from "multer";
import waclient from "./waclient";
import storage from "./storage";
import { apiAuthorize } from "./auth";
import { MessageMedia } from "whatsapp-web.js";
import fs from "fs";

//////////////////////// SERVER CONFIGS BEGINS ////////////////////////
config({ path: path.resolve(__dirname, "../.env") });

if (!process.env.API_KEY) {
  throw new Error("Missing API_KEY in .env file");
}

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", join(__dirname, "../views"));

const upload = multer({ storage });

///////////////////////// SERVER CONFIGS ENDS ////////////////////////

waclient.initialize();

app.get("/auth", async (req, res) => {
  try {
    const textFile = fs.readFileSync(join(__dirname, "../qr.txt"), "utf8");
    const qrData = textFile.trim();

    res.render("auth", { qr: qrData });
  } catch (error) {
    console.error("Error sending message:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send message", error });
  }
});

app.post("/:num/message", apiAuthorize, async (req, res) => {
  try {
    const userNumber = req.params.num;

    if (!req.body || !userNumber || !req.body.message) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const { message } = req.body;

    const finalNumber = userNumber.replace("+", "").replace(" ", "");

    if (finalNumber.length < 11) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid phone number" });
    }

    try {
      const resp = await waclient.sendMessage(`${finalNumber}@c.us`, message);

      return res
        .status(200)
        .json({
          success: true,
          message: "Message sent successfully",
          resp: `${resp}`,
        });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: true,
          message: "Failed to send message",
          error: `${error}`,
        });
    }
  } catch (error) {
    console.error("Error sending message:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send message", error });
  }
});

app.post(
  "/:num/file",
  apiAuthorize,
  upload.single("file"),
  async (req, res) => {
    try {
      const { caption, fileUrl } = req.body; // Get caption & file URL from request body
      const userNumber = req.params.num;
      const file = req.file;

      // Validate phone number
      if (!userNumber) {
        return res
          .status(400)
          .json({ success: false, message: "Missing phone number" });
      }

      const finalNumber = userNumber.replace("+", "").replace(" ", "").trim();
      if (finalNumber.length < 11) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid phone number" });
      }

      let media: MessageMedia | null = null;

      if (file) {
        // ✅ Send file from uploaded file
        media = MessageMedia.fromFilePath(file.path);
      } else if (fileUrl) {
        // ✅ Send file from URL
        media = await MessageMedia.fromUrl(fileUrl, { unsafeMime: true });
      } else {
        return res
          .status(400)
          .json({ success: false, message: "No file provided" });
      }

      if (!media) {
        return res
          .status(400)
          .json({ success: false, message: "Failed to process media" });
      }

      // ✅ Send the file with caption (if provided)
      await waclient.sendMessage(`${finalNumber}@c.us`, media, {
        caption: caption || "", // Default empty caption if none provided
      });

      // ✅ Remove uploaded file after sending (if applicable)
      if (file) {
        fs.unlinkSync(file.path);
      }

      return res
        .status(200)
        .json({ success: true, message: "File sent successfully" });
    } catch (error) {
      console.error("Error sending message:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to send message", error });
    }
  }
);

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => {
  console.log(`✅ ZWAPI Server is running on port ${PORT}`);
});
