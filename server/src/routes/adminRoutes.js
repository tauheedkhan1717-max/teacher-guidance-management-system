import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js"; // Adjust path if needed
import { createInvite, listInvites } from "../controllers/adminController.js";

const router = Router();

// Every route in this file requires a valid token AND the ADMIN role
router.use(authenticate, authorize("ADMIN"));

router.post("/invites", createInvite);
router.get("/invites", listInvites);

export const adminRouter = router;