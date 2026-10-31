import brandRouter from "./brand.route.js";
import categoryRouter from "./category.route.js";
import productRouter from "./product.route.js";
import reviewRouter from "./review.route.js";
import userRouter from "./user.route.js";

export const mountRoutes = (app) => {
  app.use("/api/v1/user", userRouter);
  app.use("/api/v1/brand", brandRouter);
  app.use("/api/v1/category", categoryRouter);
  app.use("/api/v1/product", productRouter);
  app.use("/api/v1/review", reviewRouter);
};
