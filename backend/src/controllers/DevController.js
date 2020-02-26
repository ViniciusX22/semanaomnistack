const axios = require("axios");
const Dev = require("../models/Dev");
const parseStringAsArray = require("../utils/parseStringAsArray");
const { findConnections, sendMessage } = require("../websocket");

module.exports = {
  async index(request, response) {
    const devs = await Dev.find();

    return response.json(devs);
  },
  async store(request, response) {
    const { github_username, techs, latitude, longitude } = request.body;

    let dev = await Dev.findOne({ github_username });

    if (!dev) {
      const apiResponse = await axios.get(
        `https://api.github.com/users/${github_username}`
      );

      const { name = login, avatar_url, bio } = apiResponse.data;

      const techsArray = parseStringAsArray(techs);

      const location = {
        type: "Point",
        coordinates: [longitude, latitude]
      };

      dev = await Dev.create({
        github_username,
        name,
        avatar_url,
        bio,
        techs: techsArray,
        location
      });

      const sendSocketMessageTo = findConnections(
        { latitude, longitude },
        techsArray
      );

      sendMessage(sendSocketMessageTo, "new-dev", dev);
    }

    return response.json(dev);
  },
  async update(request, response) {
    const dev = request.body;

    const currentDev = await Dev.findOne({
      github_username: dev.github_username
    });

    if (currentDev) {
      currentDev.name = dev.name || currentDev.name;
      currentDev.bio = dev.bio || currentDev.bio;
      currentDev.avatar_url = dev.avatar_url || currentDev.avatar_url;
      currentDev.techs = dev.techs
        ? parseStringAsArray(dev.techs)
        : currentDev.techs;
      currentDev.location.coordinates[0] =
        dev.longitude || currentDev.location.coordinates[0];
      currentDev.location.coordinates[1] =
        dev.latitude || currentDev.location.coordinates[1];
      currentDev.save();

      return response.json(currentDev);
    } else {
      return response.json({ message: "Nome de usuário não encontrado." });
    }
  },
  async destroy(request, response) {
    const { github_username } = request.query;

    const dev = await Dev.findOne({ github_username });

    if (dev) {
      await Dev.deleteOne({ github_username });
      return response.json(dev);
    } else {
      return response.json({ message: "Nome de usuário não encontrado." });
    }
  }
};
