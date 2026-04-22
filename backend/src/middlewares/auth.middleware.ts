import { NextFunction, Request, Response } from "express";

export const attachUserId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
 const headerUserId = res.locals.userId;

  res.locals.userId = headerUserId || "demo-user";
  next();
};
