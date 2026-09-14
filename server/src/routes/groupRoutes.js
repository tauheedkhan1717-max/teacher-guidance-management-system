// Group management routes — the teacher write-scope primitive.
//   GET    /api/groups                    → TEACHER (own) | ADMIN (all)
//   POST   /api/groups                    → TEACHER, ADMIN (create own group)
//   DELETE /api/groups/:id                → TEACHER (owner) | ADMIN (owner-or-admin in controller)
//   GET    /api/groups/:id/members        → TEACHER (owner) | ADMIN
//   POST   /api/groups/:id/members        → TEACHER (owner) | ADMIN (Zod validate)
//   DELETE /api/groups/:id/members/:memberId → TEACHER (owner) | ADMIN
// Ownership (author-or-admin style) is enforced inside the controller, mirroring NoticeBoard.
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createGroupSchema,
  addGroupMemberSchema,
} from "../schemas/index.js";
import {
  listMyGroups,
  createGroup,
  deleteGroup,
  listMembers,
  addMember,
  removeMember,
} from "../controllers/groupController.js";

const router = Router();

router.use(authenticate);
router.use(authorize("TEACHER", "ADMIN"));

router.get("/", listMyGroups);

router.post("/", validate(createGroupSchema), createGroup);

router.delete("/:id", deleteGroup);

router.get("/:id/members", listMembers);

router.post("/:id/members", validate(addGroupMemberSchema), addMember);

router.delete("/:id/members/:memberId", removeMember);

export const groupRouter = router;
