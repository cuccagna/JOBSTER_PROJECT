require("express-async-errors");
const Job = require("../models/Job");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, NotFoundError } = require("../errors");
const mongoose = require("mongoose");
//var moment = require("moment");

const elaboraQueryString = (req, queryObject) => {
  const { search, sort, page, limit } = req.query;
  const sortAndPaginationOption = {};
  for (let propr of Object.keys(req.query)) {
    switch (propr) {
      case "search":
        queryObject.position = { $regex: search, $options: "i" };
        break;
      case "status":
      case "jobType":
        if (req.query[propr] != "all") {
          queryObject[propr] = req.query[propr];
        }
        break;
      case "page":
        establishPagination(page, limit, sortAndPaginationOption);
        break;
      case "sort":
        establishSortOrder(sort, sortAndPaginationOption);
        break;
      default:
        queryObject[propr] = req.query[propr]; //with this I set other properties in case they are present and the properties doesn't exist in the schema will generate an exception because in the schema I have scrictQuery:"throw"
    }
  }

  return sortAndPaginationOption;
};

const establishPagination = (page, limit, sortAndPaginationOption) => {
  const pageNum = Number(page) || 1;
  const limitForPage = Number(limit) || 10;
  const skip = (pageNum - 1) * limitForPage;

  sortAndPaginationOption.skip = skip;
  sortAndPaginationOption.limit = limitForPage;
};

const establishSortOrder = (sort, sortAndPaginationOption) => {
  switch (sort) {
    case "latest":
      sortAndPaginationOption.sort = "-createdAt";
      break;
    case "oldest":
      sortAndPaginationOption.sort = "createdAt";
      break;
    case "a-z":
      sortAndPaginationOption.sort = "position";
      break;
    case "z-a":
      sortAndPaginationOption.sort = "-position";
      break;
  }
};

const getAllJobs = async (req, res) => {
  //per farci tornare solo i job dell'utente attualmente loggato
  const queryObject = { createdBy: req.user.userId };

  let result = Job.find(queryObject);
  //console.log("🚀 ~ file: jobs.js:64 ~ getAllJobs ~ result:", result);

  const sortAndPaginationOption = elaboraQueryString(req, queryObject);
  //const jobs = await Job.find({ createdBy: req.user.userId }).sort("createdAt");
  const jobs = await Job.find(queryObject, null, sortAndPaginationOption);
  const totalJobs = await Job.countDocuments(queryObject);

  res.status(StatusCodes.OK).json({
    jobs,
    totalJobs: jobs.length,
    numOfPages: Math.ceil(totalJobs / sortAndPaginationOption.limit),
  });
};
const getJob = async (req, res) => {
  const {
    user: { userId },
    params: { id: jobId },
  } = req;

  const job = await Job.findOne({
    _id: jobId,
    createdBy: userId,
  });
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`);
  }
  res.status(StatusCodes.OK).json({ job });
};

const createJob = async (req, res) => {
  req.body.createdBy = req.user.userId;
  const job = await Job.create(req.body);
  res.status(StatusCodes.CREATED).json({ job });
};

const updateJob = async (req, res) => {
  const {
    body: { company, position },
    user: { userId },
    params: { id: jobId },
  } = req;

  if (company === "" || position === "") {
    throw new BadRequestError("Company or Position fields cannot be empty");
  }
  const job = await Job.findByIdAndUpdate(
    { _id: jobId, createdBy: userId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`);
  }
  res.status(StatusCodes.OK).json({ job });
};

const deleteJob = async (req, res) => {
  const {
    user: { userId },
    params: { id: jobId },
  } = req;

  const job = await Job.findByIdAndRemove({
    _id: jobId,
    createdBy: userId,
  });
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`);
  }
  res.status(StatusCodes.OK).send();
};

const jobStats = async (req, res) => {
  //torna un array di oggetti
  let stats = await Job.aggregate([
    { $match: { createdBy: new mongoose.Types.ObjectId(req.user.userId) } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  console.log("🚀 ~ file: jobs.js:143 ~ jobStats ~ stats:", stats);

  stats = stats.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});
  //console.log("🚀 ~ file: jobs.js:147 ~ jobStats ~ re:", re);

  const defaultStats = {
    pending: stats.pending || 0,
    interview: stats.interview || 0,
    declined: stats.declined || 0,
  };

  let monthlyApplications = await Job.aggregate([
    { $match: { createdBy: new mongoose.Types.ObjectId(req.user.userId) } },
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } },
    { $limit: 6 },
  ]);
  console.log(
    "🚀 ~ file: jobs.js:170 ~ jobStats ~ monthlyApplications:",
    monthlyApplications
  );

  const formatter = new Intl.DateTimeFormat("en-us", {
    month: "short", //mese con 3 lettere
    year: "numeric", //anno con 4 numeri
  });

  //console.log(monthlyApplications);
  monthlyApplications = monthlyApplications
    .map((item) => {
      const {
        _id: { year, month },
        count,
      } = item;
      const date = formatter.format(new Date(year, month - 1)); //torna la stringa Jan 2023 per esempio
      /*  moment()
        .month(month - 1)
        .year(year)
        .format("MMM Y"); */
      return { date, count };
    })
    .reverse();

  console.log(monthlyApplications);
  console.log(typeof monthlyApplications[0].date);
  res.status(StatusCodes.OK).json({ defaultStats, monthlyApplications });
};

module.exports = {
  createJob,
  deleteJob,
  getAllJobs,
  updateJob,
  getJob,
  jobStats,
};
