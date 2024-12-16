// นำเข้าไลบรารีที่จำเป็น
require("dotenv").config(); // โหลด .env
const express = require("express"); // สำหรับสร้าง API
const mongoose = require("mongoose"); // สำหรับเชื่อมต่อ
const multer = require("multer"); // ใช้ multer สำหรับการจัดการไฟล์ที่อัปโหลด
const nodemailer = require("nodemailer"); // สำหรับส่งอีเมล
const cors = require("cors"); // สามารถเข้าถึง API 

const app = express();
app.use(express.json());
app.use(cors());


mongoose
  .connect("mongodb://127.0.0.1:27017/job_application")
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));

// เก็บข้อมูลผู้สมัครงาน
const applicationSchema = new mongoose.Schema({
  fullName: String, // ชื่อ - นามสกุล
  email: String, // อีเมล
  phone: String, // เบอร์โทร
  idCardDetails: String, // ข้อมูลจากบัตรประชาชน
  additionalInfo: String, // ข้อมูลเพิ่มเติมจากผู้สมัคร
  workSamples: [String], // ผลงาน - เอกสาร (เก็บได้หลายไฟล์)
  createdAt: { type: Date, default: Date.now }, // วันและเวลาที่สร้าง
});

const Application = mongoose.model("Application", applicationSchema);

// สำหรับจัดการการอัปโหลดไฟล์
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage }); // ตั้งค่าการอัปโหลดไฟล์

// API ดึงข้อมูลผู้สมัครทั้งหมด
app.get("/applications", async (req, res) => {
  try {
    const applications = await Application.find();
    res.status(200).json(applications);
  } catch (err) {
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
  }
});

// API ดึงข้อมูลผู้สมัครงานตาม ID
app.get("/applications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ error: "ไม่พบข้อมูลผู้สมัครงาน" });
    }
    res.status(200).json(application);
  } catch (err) {
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูล" });
  }
});

// API ส่งฟอร์มการสมัครงาน
app.post("/submit-application", upload.fields([{ name: "workSamples", maxCount: 5 }]), (req, res) => {
  const { fullName, email, phone, idCardDetails, additionalInfo } = req.body;
  const workSamples = req.files.workSamples ? req.files.workSamples.map((file) => file.path) : [];

  const newApplication = new Application({
    fullName,
    email,
    phone,
    idCardDetails,
    additionalInfo,
    workSamples,
  });

  newApplication
    .save()
    .then(() => {
      sendConfirmationEmail(email);
      res.status(200).json({ message: "สมัครงานสำเร็จ" });
    })
    .catch((err) => {
      res.status(500).json({ error: "เกิดข้อผิดพลาด" });
    });
});

// ฟังก์ชันส่งอีเมลยืนยันการสมัครงาน
function sendConfirmationEmail(email) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: 'apitrat701@gmail.com',
      pass: 'xxxxxxxxxxxx',
    },
  });

  const mailOptions = {
    from: {
      name: "Job Application",
      address: process.env.EMAIL_USER,
    },
    to: 'apitrat701@gmail.com', // ตั้งค่าอีเมล
    subject: "ยืนยันการสมัครงาน",
    text: "ข้อมูลสมัครงานได้รับแล้ว เราจะติดต่อกลับโดยเร็วที่สุด",
    html: "<b>ข้อมูลสมัครงานได้รับแล้ว เราจะติดต่อกลับโดยเร็วที่สุด</b>",
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error); // ตรวจสอบข้อผิดพลาด
      res.status(500).json({ error: "ไม่สามารถส่งอีเมลได้" }); // ส่งข้อความข้อผิดพลาด
    } else {
      console.log("Email sent successfully:", info.response);
    }
  });
}

// ฟังคำขอจากเซิร์ฟเวอร์ที่พอร์ต 5000
app.listen(5000, () => console.log("Server is Running on port 5000"));