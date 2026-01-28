import { Elysia } from "elysia";
import { licenseRoutes } from "./routes/license.ts";
import { adminRoutes } from "./routes/admin.ts";

const app = new Elysia()
  .use(licenseRoutes)
  .use(adminRoutes)
  .onError(({ code, error, set }) => {
    console.error("Server error:", error);

    set.status = 500;

    if (code === "VALIDATION") {
      set.status = 400;
      return {
        error: "Validation error",
        details: error
      };
    }

    return {
      error: "Internal server error",
      message: error.message
    };
  })
  .listen(3002);

console.log("License Server running at http://localhost:3002");
