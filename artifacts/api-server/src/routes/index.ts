import { Router, type IRouter } from "express";
import healthRouter from "./health";
import applicationsRouter from "./applications";
import departmentsRouter from "./departments";
import analyticsRouter from "./analytics";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(applicationsRouter);
router.use(departmentsRouter);
router.use(analyticsRouter);
router.use(aiRouter);

export default router;
