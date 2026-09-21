import AuditLog from "../models/AuditLog.js";
import catchAsync from "../utils/catchAsync.js";

export const getAuditLogs = catchAsync(async (req, res, next) => {
  const { entityType, entityId, actor, action, page = 1, limit = 50 } = req.query;

  const filter = {};
  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;
  if (actor) filter.actor = actor;
  if (action) filter.action = action;

  const logs = await AuditLog.find(filter)
    .populate("actor", "email firstName lastName")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await AuditLog.countDocuments(filter);

  res.status(200).json({
    status: "success",
    results: logs.length,
    total,
    page: Number(page),
    data: { logs },
  });
});
