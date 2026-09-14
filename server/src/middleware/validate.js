// Express middleware that validates req.body against a Zod schema.
// On success it attaches the parsed result to req.validated; on failure it responds 400
// with a readable message for every invalid field instead of letting bad data reach the controller.
import { z } from "zod";

export function validate(schema) {
  return (req, res, next) => {
    try {
      req.validated = schema.parse(req.body ?? {});
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const details = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
        return res.status(400).json({ error: { message: details.join("; ") } });
      }
      next(err);
    }
  };
}