export function localHost(req, res, next) {
  res.set("X-Content-Type-Options", "nosniff");
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(
      (req.hostname || "").toLowerCase(),
    )
  )
    return res.status(403).json({ error: "Local requests only" });
  next();
}
export function localOrigin(req, res, next) {
  if (
    req.get("origin") &&
    !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.get("origin"))
  )
    return res.status(403).json({ error: "Local origin required" });
  next();
}
