/* const path = require("path");
const fs = require("fs"); */
require("dotenv").config();
const JobModel = require("./models/Job");
const UserModel = require("./models/User");
const mongoose = require("mongoose");
const jobData = require("./mock_data.json");

async function populate() {
  let connectDB;
  try {
    connectDB = await mongoose.connect(process.env.MONGO_URI);
    /*  const jobData = await fs.readFile(
    path.resolve(__dirname, "./moch_data.json")
  ); */
    //restituisce un oggetto con chiave _id e il valore new ObjectId(valore qui)
    let idTestUser = await UserModel.findOne({ name: "demo user" }, ["_id"]);

    await JobModel.deleteMany({ createdBy: idTestUser._id });
    await JobModel.insertMany(jobData);
    connectDB.disconnect();
  } catch (err) {
    console.log("Errore mentre carico i job fake: " + err);
    connectDB.disconnect();
  }
}

populate();
