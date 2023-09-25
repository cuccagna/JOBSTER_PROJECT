const User = require("../models/User");
const { StatusCodes } = require("http-status-codes");
const { BadRequestError, UnauthenticatedError } = require("../errors");

const register = async (req, res) => {
  const user = await User.create({ ...req.body });
  const token = user.createJWT();
  res.status(StatusCodes.CREATED).json({
    user: {
      email: user.email,
      lastName: user.lastName,
      location: user.location,
      name: user.name,
      token,
    },
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError("Please provide email and password");
  }
  const user = await User.findOne({ email });
  if (!user) {
    throw new UnauthenticatedError("Invalid Credentials");
  }
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new UnauthenticatedError("Invalid Credentials");
  }
  // compare password
  const token = user.createJWT();
  res.status(StatusCodes.OK).json({
    user: {
      email: user.email,
      lastName: user.lastName,
      location: user.location,
      name: user.name,
      token,
    },
  });
};

const updateUser = async (req, res) => {
  const { email, name, lastName, location } = req.body;
  if (!email || !name || !lastName || !location) {
    throw new BadRequestError("Please provide all values");
  }

  const user = await User.findOneAndUpdate(
    { _id: req.user.userId },
    {
      email: email,
      lastName: lastName,
      location: location,
      name: name,
    },
    {
      //rawResult: true,
      new: true,
      runValidators: true,
    }
  );

  //findOneAndYpdate ritorna null se non trova l'utente
  if (!user) {
    throw new UnauthenticatedError("I couldn't find the user");
  }
  //console.log(user);
  /* const user = await User.findOne({ _id: req.userId });
  if (!user) {
    throw new UnauthenticatedError("I couldn't find the user");
  }

  user.email = email;
  user.name = name;
  user.lastName = lastName;
  user.location = location;

  await user.save(); */

  const token = user.createJWT();

  res.status(StatusCodes.OK).json({
    user: {
      email: user.email,
      lastName,
      location,
      name,
      token,
    },
  });
  //console.log(req.user); //req.user viene dal middleware authentication.js
  //console.log(req.body); //req.body sono i dati passati nella form
};

module.exports = {
  register,
  login,
  updateUser,
};
