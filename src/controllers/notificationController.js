import Notification from "../models/Notification.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";

export const getMyNotifications = catchAsync(async (req, res, next) => {
  const { read, page = 1, limit = 20 } = req.query;

  const filter = { user: req.user._id };
  if (read !== undefined) filter.read = read === "true";

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const unreadCount = await Notification.countDocuments({
    user: req.user._id,
    read: false,
  });

  res.status(200).json({
    status: "success",
    results: notifications.length,
    unreadCount,
    data: { notifications },
  });
});

export const markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!notification) {
    return next(new AppError("Известието не е намерено.", 404));
  }

  await notification.markAsRead();

  res.status(200).json({ status: "success", data: { notification } });
});

export const markAllAsRead = catchAsync(async (req, res, next) => {
  await Notification.updateMany(
    { user: req.user._id, read: false },
    { read: true, readAt: new Date() }
  );

  res.status(200).json({ status: "success", message: "Всички известия са маркирани като прочетени." });
});

export const deleteNotification = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!notification) {
    return next(new AppError("Известието не е намерено.", 404));
  }

  res.status(204).json({ status: "success", data: null });
});
