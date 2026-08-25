class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = "UsageError";
  }
}

const PLATFORM_ALIASES = new Map([
  ["xiaohongshu", "xiaohongshu"],
  ["xhs", "xiaohongshu"],
  ["bilibili", "bilibili"],
  ["bili", "bilibili"],
  ["b站", "bilibili"],
  ["douyin", "douyin"],
  ["抖音", "douyin"],
]);

function platform(value) {
  const normalized = PLATFORM_ALIASES.get(String(value || "").trim().toLowerCase());
  if (!normalized) {
    throw new UsageError(`无效平台: ${value}。可选 xiaohongshu、bilibili、douyin。`);
  }
  return normalized;
}

function nonEmpty(value, label, maxLength = 4096) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new UsageError(`未提供${label}`);
  }
  if (normalized.length > maxLength || /[\u0000-\u001f]/.test(normalized)) {
    throw new UsageError(`${label}格式无效`);
  }
  return normalized;
}

function integer(value, label, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new UsageError(`${label}必须是 ${min}-${max} 的整数`);
  }
  return parsed;
}

function choice(value, label, allowed) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!allowed.includes(normalized)) {
    throw new UsageError(`${label}必须是 ${allowed.join(" / ")}`);
  }
  return normalized;
}

function writeSuccess(output, envelope, raw) {
  if (output === "raw") {
    process.stdout.write(`${typeof raw === "string" ? raw : JSON.stringify(raw, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
}

function writeError(error, context = {}) {
  const envelope = {
    status: "error",
    ...context,
    message: error && error.message ? error.message : String(error),
    timestamp: new Date().toISOString(),
    results: [],
  };
  process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
  process.exitCode = error instanceof UsageError ? 2 : 1;
}

module.exports = {
  UsageError,
  choice,
  integer,
  nonEmpty,
  platform,
  writeError,
  writeSuccess,
};
