import multer from "multer";
import axios from "axios";
import FormData from "form-data"; // 1. Импортираме библиотеката за бинарни данни

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB на файл
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype?.startsWith("image/")) {
      return cb(null, true);
    }
    return cb(
      new Error("Избраният файл трябва да бъде изображение!"),
      false
    );
  },
});

export const uploadProductImages = [
  upload.array("images", 2),
  async (req, res, next) => {
    try {
      req.uploadedImages = [];
      
      if (!req.files || req.files.length === 0) {
        return next();
      }

      const apiKey = process.env.IMGBBB_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          message: "IMGBBB_API_KEY не е конфигуриран.",
        });
      }

      // Функция за оптимизирано бинарно качване
      const uploadSingleImage = async (file) => {
        const formData = new FormData();
        
        // 2. Подаваме директно буфера от паметта, вместо Base64 стринг
        formData.append("image", file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype,
        });

        const response = await axios.post(
          `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
          formData,
          {
            headers: {
              ...formData.getHeaders(), // 3. Автоматично добавя нужния multipart/form-data boundary хедър
            },
            timeout: 60000, // 4. Увеличаваме таймаута на 60 секунди
          }
        );

        const url = response.data?.data?.url;
        if (!url) {
          throw new Error("ImgBB не върна валиден адрес за изображението.");
        }
        return url;
      };

      const uploadPromises = req.files.map(file => uploadSingleImage(file));
      
      // Двата файла се качват паралелно без да се бавят един друг в Base64 нишки
      const imageUrls = await Promise.all(uploadPromises);

      req.uploadedImages = imageUrls;
      return next();
    } catch (error) {
      console.error(
        "ImgBB upload error:",
        error.response?.data || error.message
      );

      return res.status(502).json({
        success: false,
        message: "Възникна грешка при качването на изображенията.",
        error: error.response?.data?.error?.message || error.message,
      });
    }
  },
];
