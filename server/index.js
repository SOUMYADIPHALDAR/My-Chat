const app = require("./src/app.js");
const connectDb = require("./src/config/db.js");

const port = process.env.PORT || 3000;

connectDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is listening at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.log("MongoDb connection lost..", error.message);
  });