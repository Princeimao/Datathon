import "dotenv/config"
import { app } from "./app";
import { env } from "./src/config/env";

(async () => {
    try {
        app.listen(env.port, () => {
            console.log(`Server running on port ${env.port}`);
        });
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
})()
