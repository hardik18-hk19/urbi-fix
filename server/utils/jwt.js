import jwt from "jsonwebtoken";
import env from "../config/env.js";

// Generate JWT token
export const generateToken = (payload, expiresIn = "7d") => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid token");
  }
};

// Generate refresh token
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET || env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET || env.JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
};

export default {
  generateToken,
  verifyToken,
  generateRefreshToken,
  verifyRefreshToken,
};
