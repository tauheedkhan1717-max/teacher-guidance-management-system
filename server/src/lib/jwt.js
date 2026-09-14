// JWT helpers — sign and verify the token that is stored in the httpOnly cookie.
import jwt from "jsonwebtoken";

const EXPIRES_IN = "7d";

export function signToken(payload) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set. Add it to server/.env");
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}