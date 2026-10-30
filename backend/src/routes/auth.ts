import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User";
import asyncHandler from "../middleware/asyncHandler";
import requireAuth from "../middleware/requireAuth";

const router = Router();

const SALT_ROUNDS = 12;
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const COOKIE_SAME_SITE = process.env.NODE_ENV === "production" ? "none" : "lax";

const generateToken = (userId: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return jwt.sign({ userId }, jwtSecret, { expiresIn: "7d" });
};

const setTokenCookie = (res: Response, token: string) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: COOKIE_SAME_SITE,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
};

// POST /api/auth/register
router.post(
  "/register",
  asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: "Name, email, and password are required" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters" });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ message: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
    });

    const token = generateToken(user._id.toString());
    setTokenCookie(res, token);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  })
);

// POST /api/auth/login
router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const token = generateToken(user._id.toString());
    setTokenCookie(res, token);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  })
);

// POST /api/auth/logout
router.post("/logout", (_req: Request, res: Response) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: COOKIE_SAME_SITE,
    maxAge: 0,
    path: "/",
  });
  res.json({ message: "Logged out" });
});

// GET /api/auth/me
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findById(req.userId).select("-passwordHash");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  })
);

export default router;
